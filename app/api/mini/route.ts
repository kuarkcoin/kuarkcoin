import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYMBOL_RE = /^[A-Z0-9._\-:]{1,24}$/;
const DEFAULT_POINTS = 30;
const MAX_POINTS = 120;
const FINNHUB_TIMEOUT_MS = 8_000;
const CACHE_CONTROL = "s-maxage=60, stale-while-revalidate=300";

type FinnhubCandleResponse = {
  c?: unknown;
  s?: unknown;
};

function parsePointCount(raw: string | null) {
  if (!raw) return DEFAULT_POINTS;
  if (!/^\d+$/.test(raw)) return null;

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) return null;
  return Math.min(value, MAX_POINTS);
}

function toFinnhubSymbol(symbol: string) {
  const upper = symbol.toUpperCase();
  const [prefix, ticker = prefix] = upper.includes(":") ? upper.split(":", 2) : ["", upper];

  if (prefix === "BINANCE") {
    return { endpoint: "crypto/candle", symbol: upper };
  }

  if (prefix === "BIST") {
    return { endpoint: "stock/candle", symbol: `${ticker}.IS` };
  }

  return { endpoint: "stock/candle", symbol: ticker };
}

async function fetchFinnhubCandles(symbol: string, pointCount: number, token: string) {
  const { endpoint, symbol: finnhubSymbol } = toFinnhubSymbol(symbol);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FINNHUB_TIMEOUT_MS);

  const to = Math.floor(Date.now() / 1000);
  const from = to - Math.max(pointCount * 3, 10) * 24 * 60 * 60;
  const url = new URL(`https://finnhub.io/api/v1/${endpoint}`);
  url.searchParams.set("symbol", finnhubSymbol);
  url.searchParams.set("resolution", "D");
  url.searchParams.set("from", String(from));
  url.searchParams.set("to", String(to));
  url.searchParams.set("token", token);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) throw new Error("upstream_status");

    const data = (await res.json()) as FinnhubCandleResponse;
    if (data.s !== "ok" || !Array.isArray(data.c)) return [];

    return data.c
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .slice(-pointCount);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase();
    const pointCount = parsePointCount(searchParams.get("n"));

    if (!SYMBOL_RE.test(symbol)) {
      return NextResponse.json({ ok: false, error: "invalid_symbol" }, { status: 400 });
    }

    if (pointCount == null) {
      return NextResponse.json({ ok: false, error: "invalid_point_count" }, { status: 400 });
    }

    const token = process.env.FINNHUB_API_KEY;
    if (!token) {
      return NextResponse.json({ ok: false, error: "mini_data_unavailable" }, { status: 503 });
    }

    const points = await fetchFinnhubCandles(symbol, pointCount, token);

    return NextResponse.json(
      { ok: true, symbol, points },
      {
        headers: {
          "Cache-Control": CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    console.error("mini chart fetch failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, error: "mini_data_unavailable" }, { status: 502 });
  }
}
