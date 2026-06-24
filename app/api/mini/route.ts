import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { normalizeMarketSymbol } from "@/lib/symbols";
import { withTimeout } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESOLUTION: Record<string, string> = { "5": "5", "15": "15", "30": "30", "60": "60", D: "D", "1D": "D" };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = normalizeMarketSymbol(searchParams.get("symbol") ?? "");
  const n = Math.min(Math.max(Number(searchParams.get("n") ?? 30), 5), 60);
  const resolution = RESOLUTION[String(searchParams.get("timeframe") ?? "D").toUpperCase()] ?? "D";
  if (!symbol || symbol.market === "CRYPTO") return NextResponse.json({ ok: false, error: "Invalid symbol" }, { status: 400 });
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return NextResponse.json({ ok: false, error: "Market data is not configured" }, { status: 503 });
  const cacheKey = `mini:${symbol.providerSymbol}:${resolution}:${n}`;
  const cached = await kvGet<number[]>(cacheKey);
  if (cached) return NextResponse.json({ ok: true, points: cached }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  const to = Math.floor(Date.now() / 1000);
  const days = resolution === "D" ? n * 3 : 5;
  const from = to - days * 24 * 60 * 60;
  const finnhubSymbol = symbol.market === "BIST" ? `${symbol.ticker}.IS` : symbol.ticker;
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(finnhubSymbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${encodeURIComponent(token)}`;
  const timeout = withTimeout(8_000);
  try {
    const r = await fetch(url, { signal: timeout.signal, cache: "no-store" });
    if (!r.ok) return NextResponse.json({ ok: false, error: "Market data unavailable" }, { status: 502 });
    const data = await r.json();
    const points = Array.isArray(data?.c) ? data.c.map(Number).filter(Number.isFinite).slice(-n) : [];
    if (data?.s !== "ok" || points.length < 3) return NextResponse.json({ ok: false, error: "Market data unavailable" }, { status: 502 });
    await kvSet(cacheKey, points, 60);
    return NextResponse.json({ ok: true, points }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch { return NextResponse.json({ ok: false, error: "Market data unavailable" }, { status: 504 }); }
  finally { timeout.done(); }
}
