// app/api/news/route.ts
import { NextResponse } from "next/server";

function toTicker(symbol: string) {
  // "NASDAQ:AAPL" -> "AAPL", "BIST:ASELS" -> "ASELS" vs
  const s = (symbol || "").trim();
  if (!s) return "";
  const parts = s.split(":");
  return (parts[1] ?? parts[0]).toUpperCase();
}

function isoDate(d: Date) {
  // YYYY-MM-DD
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") ?? "";
    const max = Math.min(Number(searchParams.get("max") ?? 8), 20);

    const token = process.env.FINNHUB_API_KEY;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "FINNHUB_API_KEY missing" },
        { status: 500 }
      );
    }

    const ticker = toTicker(symbol);
    if (!ticker) {
      return NextResponse.json({ ok: true, items: [] });
    }

    // son 7 gün
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

    const url =
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}` +
      `&from=${isoDate(from)}&to=${isoDate(to)}&token=${encodeURIComponent(token)}`;

    const r = await fetch(url, { next: { revalidate: 60 } }); // 60sn cache
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Finnhub error (${r.status}) ${text}` },
        { status: 500 }
      );
    }

    const data = (await r.json()) as any[];
    const items = (Array.isArray(data) ? data : [])
      .filter((x) => x?.headline && x?.url)
      .slice(0, max)
      .map((x) => ({
        headline: String(x.headline),
        url: String(x.url),
        source: String(x.source ?? ""),
        datetime: Number(x.datetime ?? 0), // unix sec
        summary: String(x.summary ?? ""),
      }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "news failed" },
      { status: 500 }
    );
  }
}