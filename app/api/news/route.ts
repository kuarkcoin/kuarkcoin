// app/api/news/route.ts
import { NextResponse } from "next/server";

type NewsItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number; // unix seconds
  summary?: string;
  relevance?: number;
  matched?: string[];
};

function toTicker(symbol: string) {
  const s = (symbol || "").trim();
  if (!s) return "";
  const parts = s.split(":");
  return (parts[1] ?? parts[0]).toUpperCase();
}

// ✅ BIST + IST (TradingView’de IST:ASELS gibi gelebilir)
function isBistSymbol(symbol: string) {
  const u = String(symbol || "").toUpperCase();
  return u.startsWith("BIST:") || u.startsWith("IST:");
}

// ✅ ETF’ler TradingView’de AMEX:SPY / NYSEARCA:QQQ / ARCA:QQQ gibi gelebilir.
// (Bu route’ta ETF’ler “company-news” ile çalışır, sorun yok; ama prefix tespiti doğru olsun diye ekliyorum.)
function isEtfSymbol(symbol: string) {
  const u = String(symbol || "").toUpperCase();
  return u.startsWith("AMEX:") || u.startsWith("NYSEARCA:") || u.startsWith("ARCA:");
}

function isoDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampInt(raw: string | null, fallback: number, min: number, max: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// ✅ reasons= "VWAP,RSI_DIV,..." gibi geliyor → array
function parseReasonKeys(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(/[,;|\n]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

// ✅ Basit keyword eşleme: reasonKey -> arama kelimeleri
const REASON_MATCH: Record<string, string[]> = {
  VWAP: ["vwap"],
  MACD: ["macd"],
  RSI: ["rsi"],
  RSI_DIV: ["divergence", "diverjan", "uyumsuzluk"],
  GOLDEN_CROSS: ["golden cross"],
  EARNINGS: ["earnings", "results", "revenue", "profit", "guidance", "balance sheet", "quarter", "q1", "q2", "q3", "q4"],
  MERGER: ["merger", "acquisition", "acquire", "deal", "buyout"],
  // BIST/KAP için TR kelimeleri
  KAP: ["kap", "bildirim", "özel durum", "ozel durum", "yatırımcı", "yatirimci", "genel kurul", "temettü", "temettu", "bedelsiz", "sermaye", "geri alım", "geri alim"],
};

function scoreRelevance(text: string, reasonKeys: string[]) {
  const t = (text || "").toLowerCase();
  const matched: string[] = [];
  for (const k of reasonKeys) {
    const keys = REASON_MATCH[k] ?? [];
    if (keys.some((w) => t.includes(w))) matched.push(`${k}:hit`);
  }
  return { matched, relevance: matched.length };
}

// ──────────────────────────────────────────────────
// KAP RSS helpers
// ──────────────────────────────────────────────────
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

function parseRssItems(xml: string) {
  const out: { title: string; link: string; pubDate?: string; description?: string }[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const b of blocks) {
    const title = (b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
    const link = (b.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
    const pubDate = (b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
    const description = (b.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").trim();
    if (!title || !link) continue;

    out.push({
      title: decodeXml(stripCdata(title)),
      link: decodeXml(stripCdata(link)),
      pubDate: decodeXml(stripCdata(pubDate)),
      description: decodeXml(stripCdata(description)),
    });
  }
  return out;
}

function toUnixSec(dateStr?: string) {
  if (!dateStr) return 0;
  const ms = Date.parse(dateStr);
  if (!Number.isFinite(ms)) return 0;
  return Math.floor(ms / 1000);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ✅ Boundary-safe ticker check
function hasTicker(blobUpper: string, T: string) {
  const re = new RegExp(`(^|[^A-Z0-9])${escapeRegex(T)}([^A-Z0-9]|$)`);
  return re.test(blobUpper);
}

// ✅ KAP: tek RSS’ten filtrelemek pahalı değil ama daha doğru olmak için max scan arttırdım.
// Ayrıca network timeout ekledim.
async function fetchKapRss(ticker: string, max: number): Promise<NewsItem[]> {
  const rssUrl = `https://www.kap.org.tr/tr/rss/bildirimler`;

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);

  const r = await fetch(rssUrl, {
    signal: ac.signal,
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    next: { revalidate: 120 },
  }).catch(() => null);

  clearTimeout(t);
  if (!r || !r.ok) return [];

  const xml = await r.text();
  const items = parseRssItems(xml);

  const T = ticker.toUpperCase();

  // ✅ Daha fazla tara, sonra datetime’e göre kes
  const filtered = items.filter((x) => {
    const blob = `${x.title} ${x.description ?? ""}`.toUpperCase();
    return hasTicker(blob, T);
  });

  const mapped: NewsItem[] = filtered.map((x) => {
    const datetime = toUnixSec(x.pubDate) || Math.floor(Date.now() / 1000);
    const summary = x.description ? stripHtml(x.description).slice(0, 300) : "";
    return {
      headline: x.title,
      url: x.link,
      source: "KAP",
      datetime,
      summary,
    };
  });

  mapped.sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
  return mapped.slice(0, max);
}

// ──────────────────────────────────────────────────
// GET
// ──────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const symbol = searchParams.get("symbol") ?? "";
    const max = clampInt(searchParams.get("max"), 8, 1, 20); // ✅ parse fix
    const reasonKeys = parseReasonKeys(searchParams.get("reasons"));
    const debug = searchParams.get("debug") === "1";

    const ticker = toTicker(symbol);
    if (!ticker) return NextResponse.json({ ok: true, items: [], meta: debug ? { symbol, ticker } : undefined });

    // ✅ BIST/IST → KAP RSS
    if (isBistSymbol(symbol)) {
      let items = await fetchKapRss(ticker, max);

      items = items.map((x) => {
        const blob = `${x.headline} ${x.summary ?? ""}`;
        const rel = scoreRelevance(blob, reasonKeys);
        return { ...x, relevance: rel.relevance, matched: rel.matched };
      });

      if (reasonKeys.length) {
        items.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0) || (b.datetime ?? 0) - (a.datetime ?? 0));
      } else {
        items.sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
      }

      return NextResponse.json({
        ok: true,
        items: items.slice(0, max),
        meta: debug
          ? {
              mode: "KAP",
              symbol,
              ticker,
              reasonKeys,
              got: items.length,
            }
          : undefined,
      });
    }

    // ✅ Diğerleri → Finnhub company-news
    const token = process.env.FINNHUB_API_KEY;
    if (!token) return NextResponse.json({ ok: false, error: "FINNHUB_API_KEY missing" }, { status: 500 });

    const to = new Date();
    const from = new Date(to.getTime() - 10 * 24 * 60 * 60 * 1000); // ✅ 7 yerine 10 gün: boş dönme azalır

    const url =
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}` +
      `&from=${isoDate(from)}&to=${isoDate(to)}&token=${encodeURIComponent(token)}`;

    const ac = new AbortController();
    const tt = setTimeout(() => ac.abort(), 8000);

    const r = await fetch(url, { next: { revalidate: 60 }, signal: ac.signal }).catch(() => null);
    clearTimeout(tt);

    if (!r || !r.ok) {
      const text = r ? await r.text().catch(() => "") : "";
      return NextResponse.json(
        { ok: false, error: `Finnhub error (${r ? r.status : "no-response"}) ${text}` },
        { status: 500 }
      );
    }

    const data = (await r.json()) as any[];

    let items: NewsItem[] = (Array.isArray(data) ? data : [])
      .filter((x) => x?.headline && x?.url)
      .map((x) => {
        const headline = String(x.headline);
        const summary = String(x.summary ?? "");
        const blob = `${headline} ${summary}`;
        const rel = scoreRelevance(blob, reasonKeys);

        return {
          headline,
          url: String(x.url),
          source: String(x.source ?? "Finnhub"),
          datetime: Number(x.datetime ?? 0),
          summary,
          relevance: rel.relevance,
          matched: rel.matched,
        };
      });

    // ✅ reasons varsa relevance’e göre öne çıkar
    if (reasonKeys.length) {
      items.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0) || (b.datetime ?? 0) - (a.datetime ?? 0));
    } else {
      items.sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
    }

    items = items.slice(0, max);

    return NextResponse.json({
      ok: true,
      items,
      meta: debug
        ? {
            mode: isEtfSymbol(symbol) ? "FINNHUB(ETF)" : "FINNHUB",
            symbol,
            ticker,
            url,
            reasonKeys,
            got: items.length,
          }
        : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "news failed" }, { status: 500 });
  }
}