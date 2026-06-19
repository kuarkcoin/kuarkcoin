import "server-only";
import { scoreNews } from "@/lib/scoreNews";
import { NASDAQ300, ETFS, BIST100 } from "@/constants/universe";
import { clampInt, fetchWithTimeout } from "@/lib/server/fetch";

export type CombinedNewsItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number;
  summary?: string;
  matched?: string[];
  tickers?: string[];
  tags?: string[];
  score?: number;
  level?: string;
};

export type NewsUniverse = "BIST100" | "NASDAQ300" | "ETF";

export async function getNewsCombined(options: { universe?: string; limit?: number; minScore?: number } = {}) {
  const u = normalizeUniverse(options.universe);
  const limit = Math.max(1, Math.min(50, Math.floor(options.limit ?? 12)));
  const minScore = Math.max(0, Math.min(100, Math.floor(options.minScore ?? 60)));
  const universe = pickUniverse(u);
  const rawNews = await fetchExternalNews(u, universe);
  const items = rawNews
    .map((n) => {
      const r = scoreNews(n);
      const matched = n.matched ?? n.tickers ?? [];
      return { ...n, matched, tickers: matched, tags: n.tags ?? [], score: r.score, level: r.level };
    })
    .filter((n) => (n.score ?? 0) >= minScore)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);

  return { ok: true, universe: u, minScore, totalRaw: rawNews.length, items };
}

export function parseNewsSearchParams(searchParams: URLSearchParams) {
  return {
    universe: searchParams.get("u") ?? "BIST100",
    limit: clampInt(searchParams.get("limit"), 12, 1, 50),
    minScore: clampInt(searchParams.get("minScore"), 60, 0, 100),
  };
}

function normalizeUniverse(u: string | undefined): NewsUniverse {
  const v = String(u || "BIST100").toUpperCase();
  if (v === "NASDAQ300") return "NASDAQ300";
  if (v === "ETF" || v === "ETFS") return "ETF";
  return "BIST100";
}

async function fetchExternalNews(u: NewsUniverse, universeSymbols: string[]): Promise<CombinedNewsItem[]> {
  if (u === "BIST100") {
    const rss = await fetchKapRss();
    const matched = matchUniverse(rss, universeSymbols);
    if (matched.length) return matched;
    return rss.map((item) => ({ ...item, matched: [] }));
  }
  const finnhub = await fetchFinnhubMarketNews("general");
  return matchUniverse(finnhub, universeSymbols);
}

function pickUniverse(u: NewsUniverse): string[] {
  if (u === "NASDAQ300") return (NASDAQ300 ?? []).map((s) => String(s).toUpperCase());
  if (u === "ETF") return (ETFS ?? []).map((s) => String(s).toUpperCase());
  return (BIST100 ?? []).map((s) => String(s).toUpperCase());
}

async function fetchKapRss(): Promise<CombinedNewsItem[]> {
  const r = await fetchWithTimeout("https://www.kap.org.tr/tr/rss/bildirimler", { next: { revalidate: 120 } }, 8000);
  if (!r.ok) return [];
  const xml = await r.text();
  return parseRssItems(xml)
    .filter((x) => x.title && x.link)
    .map((x) => ({
      headline: x.title,
      url: x.link,
      source: "KAP",
      datetime: x.pubDate ? toUnixSec(x.pubDate) : 0,
      summary: x.description ? stripHtml(x.description).slice(0, 280) : "",
    }))
    .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
}

function parseRssItems(xml: string) {
  const out: { title: string; link: string; pubDate?: string; description?: string }[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const b of blocks) {
    const title = decodeXml(stripCdata((b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim()));
    const link = decodeXml(stripCdata((b.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim()));
    const pubDate = decodeXml(stripCdata((b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim()));
    const description = decodeXml(stripCdata((b.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").trim()));
    if (title && link) out.push({ title, link, pubDate, description });
  }
  return out;
}

async function fetchFinnhubMarketNews(category: string): Promise<CombinedNewsItem[]> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return [];
  const url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}&token=${encodeURIComponent(token)}`;
  const r = await fetchWithTimeout(url, { next: { revalidate: 120 } }, 8000);
  if (!r.ok) return [];
  const data = (await r.json()) as any[];
  return (Array.isArray(data) ? data : [])
    .filter((x) => x?.headline && x?.url)
    .map((x) => ({ headline: String(x.headline), url: String(x.url), source: String(x.source ?? "Finnhub"), datetime: Number(x.datetime ?? 0), summary: String(x.summary ?? "") }))
    .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
}

function matchUniverse(news: CombinedNewsItem[], universeSymbols: string[]): CombinedNewsItem[] {
  if (!news.length || !universeSymbols.length) return [];
  const symSet = new Set(universeSymbols.map((s) => String(s).toUpperCase()));
  const regexCache = new Map<string, RegExp>();
  const out: CombinedNewsItem[] = [];
  for (const n of news) {
    const blob = `${n.headline} ${n.summary ?? ""}`.toUpperCase();
    const matched: string[] = [];
    for (const sym of symSet) {
      let re = regexCache.get(sym);
      if (!re) {
        re = new RegExp(`(^|[^A-Z0-9])${escapeRegex(sym)}([^A-Z0-9]|$)`, "i");
        regexCache.set(sym, re);
      }
      if (re.test(blob)) matched.push(sym);
      if (matched.length >= 4) break;
    }
    if (matched.length) out.push({ ...n, matched, tickers: matched });
  }
  return out;
}

function decodeXml(s: string) { return (s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
function stripCdata(s: string) { return (s || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""); }
function stripHtml(s: string) { return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function toUnixSec(dateStr: string) { const ms = Date.parse(dateStr); return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0; }
function escapeRegex(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
