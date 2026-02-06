// app/api/news/combined/route.ts
import { NextResponse } from "next/server";
import { scoreNews } from "@/lib/scoreNews";
import { NASDAQ300, ETFS, BIST100 } from "@/constants/universe";

type CombinedNewsItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number; // unix seconds
  summary?: string;
  matched?: string[]; // örn: ["AKBNK", "THYAO"]
  score?: number;
  level?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const u = (searchParams.get("u") || "BIST100").toUpperCase();
  const limit = clampInt(searchParams.get("limit"), 12, 1, 50);
  const minScore = clampInt(searchParams.get("minScore"), 60, 0, 100);

  const universe = pickUniverse(u);
  const rawNews = await fetchExternalNews(u, universe);

  // score + filter + sort
  const scored = rawNews
    .map((n) => {
      const r = scoreNews(n); // senin mevcut fonksiyonun
      return { ...n, score: r.score, level: r.level };
    })
    .filter((n) => (n.score ?? 0) >= minScore)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);

  return NextResponse.json({
    ok: true,
    universe: u,
    minScore,
    totalRaw: rawNews.length,
    items: scored,
  });
}

// ──────────────────────────────────────────────────
// Fetchers
// ──────────────────────────────────────────────────
async function fetchExternalNews(u: string, universeSymbols: string[]): Promise<CombinedNewsItem[]> {
  if (u === "BIST100") {
    // KAP RSS → BIST ticker match
    const rss = await fetchKapRss();
    const matched = matchUniverse(rss, universeSymbols);
    if (matched.length) return matched;
    return rss.map((item) => ({ ...item, matched: [] }));
  }

  // NASDAQ300 / ETFS → Finnhub market-news (general)
  const finnhub = await fetchFinnhubMarketNews("general");
  return matchUniverse(finnhub, universeSymbols);
}

function pickUniverse(u: string): string[] {
  if (u === "NASDAQ300") return (NASDAQ300 ?? []).map((s) => String(s).toUpperCase());
  if (u === "ETFS") return (ETFS ?? []).map((s) => String(s).toUpperCase());
  return (BIST100 ?? []).map((s) => String(s).toUpperCase());
}

// ──────────────────────────────────────────────────
// KAP RSS
// ──────────────────────────────────────────────────
async function fetchKapRss(): Promise<CombinedNewsItem[]> {
  const rssUrl = "https://www.kap.org.tr/tr/rss/bildirimler";
  const r = await fetch(rssUrl, { next: { revalidate: 120 } });
  if (!r.ok) return [];

  const xml = await r.text();
  const items = parseRssItems(xml);

  const mapped: CombinedNewsItem[] = items
    .filter((x) => x.title && x.link)
    .map((x) => ({
      headline: x.title,
      url: x.link,
      source: "KAP",
      datetime: x.pubDate ? toUnixSec(x.pubDate) : 0,
      summary: x.description ? stripHtml(x.description).slice(0, 280) : "",
    }))
    .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));

  return mapped;
}

function parseRssItems(xml: string) {
  const out: { title: string; link: string; pubDate?: string; description?: string }[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];

  for (const b of blocks) {
    const title = decodeXml(stripCdata((b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim()));
    const link = decodeXml(stripCdata((b.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim()));
    const pubDate = decodeXml(stripCdata((b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim()));
    const description = decodeXml(stripCdata((b.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").trim()));
    if (!title || !link) continue;
    out.push({ title, link, pubDate, description });
  }

  return out;
}

function decodeXml(s: string) {
  return (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripCdata(s: string) {
  return (s || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function stripHtml(s: string) {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toUnixSec(dateStr: string) {
  const ms = Date.parse(dateStr);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

// ──────────────────────────────────────────────────
// Finnhub market news (general)
// ──────────────────────────────────────────────────
async function fetchFinnhubMarketNews(category: string): Promise<CombinedNewsItem[]> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return [];

  const url =
    `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}` +
    `&token=${encodeURIComponent(token)}`;

  const r = await fetch(url, { next: { revalidate: 120 } });
  if (!r.ok) return [];

  const data = (await r.json()) as any[];
  const items: CombinedNewsItem[] = (Array.isArray(data) ? data : [])
    .filter((x) => x?.headline && x?.url)
    .map((x) => ({
      headline: String(x.headline),
      url: String(x.url),
      source: String(x.source ?? "Finnhub"),
      datetime: Number(x.datetime ?? 0),
      summary: String(x.summary ?? ""),
    }))
    .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));

  return items;
}

// ──────────────────────────────────────────────────
// Matching: headline/summary içinden universe sembol bul
// ──────────────────────────────────────────────────
function matchUniverse(news: CombinedNewsItem[], universeSymbols: string[]): CombinedNewsItem[] {
  if (!news.length || !universeSymbols.length) return [];

  // Performans: küçük bir set + “word boundary” regex cache
  const symSet = new Set(universeSymbols.map((s) => String(s).toUpperCase()));
  const regexCache = new Map<string, RegExp>();

  const out: CombinedNewsItem[] = [];

  for (const n of news) {
    const blob = `${n.headline} ${n.summary ?? ""}`.toUpperCase();
    const matched: string[] = [];

    // 300 sembolde 40–80 haber → gayet OK (server)
    for (const sym of symSet) {
      // AAPL / MSFT gibi kısa sembollerde yanlış eşleşme olmasın diye boundary
      let re = regexCache.get(sym);
      if (!re) {
        re = new RegExp(`(^|[^A-Z0-9])${escapeRegex(sym)}([^A-Z0-9]|$)`, "i");
        regexCache.set(sym, re);
      }
      if (re.test(blob)) matched.push(sym);
      if (matched.length >= 4) break; // çok uzatmayalım
    }

    if (matched.length) out.push({ ...n, matched });
  }

  return out;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampInt(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
