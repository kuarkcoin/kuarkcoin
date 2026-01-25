// app/api/news/route.ts
import { NextResponse } from "next/server";

function toTicker(symbol: string) {
  const s = (symbol || "").trim();
  if (!s) return "";
  const parts = s.split(":");
  return (parts[1] ?? parts[0]).toUpperCase();
}

function isoDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
// (İstersen bunu constants/terminal ile aynı sözlükten besleriz)
const REASON_MATCH: Record<string, string[]> = {
  VWAP: ["vwap"],
  MACD: ["macd"],
  RSI: ["rsi"],
  "RSI_DIV": ["divergence", "diverjan", "uyumsuzluk"],
  "GOLDEN_CROSS": ["golden cross"],
  "EARNINGS": ["earnings", "results", "revenue", "profit", "guidance"],
  "MERGER": ["merger", "acquisition", "acquire", "deal"],
};

function scoreRelevance(text: string, reasonKeys: string[]) {
  const t = (text || "").toLowerCase();
  const matched: string[] = [];

  for (const k of reasonKeys) {
    const keys = REASON_MATCH[k] ?? [];
    if (keys.some((w) => t.includes(w))) matched.push(`${k}:hit`);
  }

  return {
    matched,
    relevance: matched.length, // 0..N
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") ?? "";
    const max = Math.min(Number(searchParams.get("max") ?? 8), 20);
    const reasonKeys = parseReasonKeys(searchParams.get("reasons"));

    const token = process.env.FINNHUB_API_KEY;
    if (!token) {
      return NextResponse.json({ ok: false, error: "FINNHUB_API_KEY missing" }, { status: 500 });
    }

    const ticker = toTicker(symbol);
    if (!ticker) return NextResponse.json({ ok: true, items: [] });

    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

    const url =
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}` +
      `&from=${isoDate(from)}&to=${isoDate(to)}&token=${encodeURIComponent(token)}`;

    const r = await fetch(url, { next: { revalidate: 60 } });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Finnhub error (${r.status}) ${text}` },
        { status: 500 }
      );
    }

    const data = (await r.json()) as any[];

    let items = (Array.isArray(data) ? data : [])
      .filter((x) => x?.headline && x?.url)
      .map((x) => {
        const headline = String(x.headline);
        const summary = String(x.summary ?? "");
        const blob = `${headline} ${summary}`;

        const rel = scoreRelevance(blob, reasonKeys);

        return {
          headline,
          url: String(x.url),
          source: String(x.source ?? ""),
          datetime: Number(x.datetime ?? 0),
          summary,
          relevance: rel.relevance,
          matched: rel.matched,
        };
      });

    // ✅ reasons varsa, relevance’e göre öne çıkar
    if (reasonKeys.length) {
      items.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0) || (b.datetime ?? 0) - (a.datetime ?? 0));
    } else {
      // yoksa tarihe göre (zaten genelde öyle gelir ama garanti)
      items.sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
    }

    items = items.slice(0, max);

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "news failed" }, { status: 500 });
  }
}