import { NextResponse } from "next/server";
import { NASDAQ300, ETFS } from "@/constants/universe";

export const dynamic = "force-dynamic";

type KapRow = {
  title: string;
  url: string;
  source: string;
  datetime: number; // unix sec
  tags: string[];
  stockCodes: string[];
};

type NewsItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number;      // unix sec
  tickers: string[];     // ["NASDAQ:AAPL"] | ["ETF:QQQ"] | ["BIST:ASELS"]
  tags: string[];
};

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

function normalizeUniverse(u: string) {
  const U = String(u || "BIST100").toUpperCase();
  if (U === "NASDAQ300") return "NASDAQ300";
  if (U === "ETF") return "ETF";
  return "BIST100";
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

function autoTags(headline: string) {
  const t = (headline || "").toLowerCase();
  const tags = new Set<string>();
  if (/(acquisition|merger|m&a|takeover|satın alma|birleş)/.test(t)) tags.add("M&A");
  if (/(earnings|results|guidance|bilanço|financial)/.test(t)) tags.add("EARNINGS");
  if (/(dividend|temett)/.test(t)) tags.add("DIVIDEND");
  if (/(buyback|geri alım)/.test(t)) tags.add("BUYBACK");
  if (/(contract|agreement|deal|ihale|sözleşme|iş anlaş)/.test(t)) tags.add("CONTRACT");
  if (/(defense|navy|warship|frigate|corvette|savunma|donanma|fırkateyn|korvet)/.test(t)) tags.add("DEFENSE");
  if (/(negative|lawsuit|investigation|fraud|downgrade|ceza|soruşturma|dava)/.test(t)) tags.add("NEGATIVE");
  return Array.from(tags);
}

/**
 * Haber metninden + Finnhub related alanından tickers yakala:
 * - Büyük harf token'ları çıkar
 * - Universe set'inde olanları filtrele
 */
function extractTickersFromText(text: string, universeSet: Set<string>) {
  const tokens = new Set<string>();

  // 1) $AAPL gibi kalıplar
  const dollarMatches = text.match(/\$[A-Z]{1,6}\b/g) || [];
  for (const m of dollarMatches) tokens.add(m.replace("$", ""));

  // 2) Normal tokenizasyon
  const raw = text
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  for (const tok of raw) {
    // ticker olma ihtimali yüksek (1-6)
    if (tok.length >= 1 && tok.length <= 6) tokens.add(tok);
  }

  // sadece universe içindekiler
  return Array.from(tokens).filter((t) => universeSet.has(t));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const u = normalizeUniverse(searchParams.get("u") || "BIST100");
  const limit = Math.min(40, Math.max(1, Number(searchParams.get("limit") || 12)));

  const items: NewsItem[] = [];
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // 1) BIST100 → KAP Important
  if (u === "BIST100") {
    try {
      const kapRes = await fetch(`${base}/api/kap/bist100-important?mode=strict`, {
        next: { revalidate: 60 }, // 60 sn cache
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

  // 2) NASDAQ300 / ETF → Finnhub general news → ticker yakala
  if ((u === "NASDAQ300" || u === "ETF") && FINNHUB_KEY) {
    const universePlain = u === "NASDAQ300" ? NASDAQ300 : ETFS;
    const universeSet = new Set(universePlain.map((x) => String(x).toUpperCase()));

    try {
      // “General” haber akışı: tek çağrı → sonra ticker yakalıyoruz
      const url = `https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(FINNHUB_KEY)}`;
      const res = await fetch(url, { next: { revalidate: 120 } }); // 2 dk cache
      const arr = res.ok ? await res.json() : [];

      for (const n of Array.isArray(arr) ? arr.slice(0, 80) : []) {
        const headline = String(n?.headline || "");
        const link = String(n?.url || "");
        const dt = Number(n?.datetime || 0);
        if (!headline || !link || !dt) continue;

        const relatedRaw = String(n?.related || "");
        const relatedPlain = relatedRaw
          .split(/[,\s]+/g)
          .map((x) => x.trim().toUpperCase())
          .filter(Boolean);

        // Finnhub related + headline içinde ticker ara
        const text = `${headline} ${String(n?.summary || "")} ${relatedRaw}`;
        const found = new Set<string>();

        // related’tan
        for (const r of relatedPlain) if (universeSet.has(r)) found.add(r);

        // text’ten
        for (const t of extractTickersFromText(text, universeSet)) found.add(t);

        if (found.size === 0) continue;

        const prefix = u === "ETF" ? "ETF:" : "NASDAQ:";
        items.push({
          headline,
          url: link,
          source: String(n?.source || "FINNHUB"),
          datetime: dt,
          tickers: Array.from(found).slice(0, 8).map((t) => `${prefix}${t}`),
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