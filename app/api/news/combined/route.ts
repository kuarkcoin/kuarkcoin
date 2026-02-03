import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type KapRow = {
  title: string;
  url: string;
  source: string;
  datetime: number; // unix sec
  company?: string;
  tags: string[];
  stockCodes: string[];
};

type NewsItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number;      // unix sec
  tickers: string[];
  tags: string[];
};

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

// Basit tagger (istersen geliştiririz)
function autoTags(headline: string) {
  const t = (headline || "").toLowerCase();
  const tags = new Set<string>();
  if (/(acquisition|merger|m&a|takeover|satın alma|birleş)/.test(t)) tags.add("M&A");
  if (/(earnings|results|guidance|bilanço|financial)/.test(t)) tags.add("EARNINGS");
  if (/(dividend|temett)/.test(t)) tags.add("DIVIDEND");
  if (/(buyback|geri alım)/.test(t)) tags.add("BUYBACK");
  if (/(contract|agreement|deal|ihale|sözleşme|iş anlaş)/.test(t)) tags.add("CONTRACT");
  if (/(defense|navy|warship|frigate|corvette|savunma|donanma|fırkateyn|korvet)/.test(t)) tags.add("DEFENSE");
  return Array.from(tags);
}

function uniqByUrl(items: NewsItem[]) {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of items) {
    const key = String(it.url || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// Query: ?u=BIST100|NASDAQ100|ETF
function normalizeUniverse(u: string) {
  const U = String(u || "BIST100").toUpperCase();
  if (U === "NASDAQ100") return "NASDAQ100";
  if (U === "ETF") return "ETF";
  return "BIST100";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const u = normalizeUniverse(searchParams.get("u") || "BIST100");
  const limit = Math.min(30, Math.max(1, Number(searchParams.get("limit") || 12)));

  const items: NewsItem[] = [];

  // 1) BIST → KAP Important (senin route)
  if (u === "BIST100") {
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const kapRes = await fetch(`${base}/api/kap/bist100-important?mode=strict`, {
        // DB yok → kısa cache daha mantıklı
        next: { revalidate: 60 }, // 60 sn
      });
      const kapJson = kapRes.ok ? await kapRes.json() : null;
      const kapRows: KapRow[] = (kapJson?.items ?? []) as KapRow[];

      for (const k of kapRows || []) {
        if (!k?.url || !k?.title || !k?.datetime) continue;
        items.push({
          headline: String(k.title),
          url: String(k.url),
          source: "KAP",
          datetime: Number(k.datetime),
          tickers: (k.stockCodes || []).map((c) => `BIST:${String(c).toUpperCase()}`),
          tags: Array.from(new Set([...(k.tags || []), ...autoTags(k.title)])),
        });
      }
    } catch {}
  }

  // 2) NASDAQ/ETF → Finnhub general news (basit, hızlı)
  // Not: Finnhub "general news" tek endpoint; ticker bazlı istersen onu da ekleriz.
  if ((u === "NASDAQ100" || u === "ETF") && FINNHUB_KEY) {
    try {
      const url = `https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(FINNHUB_KEY)}`;
      const res = await fetch(url, { next: { revalidate: 120 } }); // 2 dk cache
      const arr = res.ok ? await res.json() : [];
      // Finnhub item shape: {headline, url, source, datetime, related}
      for (const n of Array.isArray(arr) ? arr.slice(0, 25) : []) {
        const headline = String(n?.headline || "");
        const link = String(n?.url || "");
        const dt = Number(n?.datetime || 0);
        if (!headline || !link || !dt) continue;

        // related bazen "AAPL,MSFT" gibi gelir
        const relatedRaw = String(n?.related || "");
        const related = relatedRaw
          .split(/[,\s]+/g)
          .map((x) => x.trim().toUpperCase())
          .filter(Boolean)
          .slice(0, 8);

        // Universe prefix: ETF için "ETF:" kullanacağız ama related ticker'lar hisse olur genelde.
        // Şimdilik NASDAQ: diye prefixleyelim; ETF için de gene aynı, çünkü haberin çoğu şirket haberi.
        const tickers = related.map((t) => `NASDAQ:${t}`);

        items.push({
          headline,
          url: link,
          source: String(n?.source || "FINNHUB"),
          datetime: dt,
          tickers,
          tags: autoTags(headline),
        });
      }
    } catch {}
  }

  const out = uniqByUrl(items)
    .sort((a, b) => (b.datetime || 0) - (a.datetime || 0))
    .slice(0, limit);

  return NextResponse.json({ ok: true, universe: u, items: out });
}