import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

function noStore(json: any, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

function normalizeYahooSymbol(input: string) {
  const raw = String(input || "BIMAS").trim().toUpperCase();
  const plain = raw.includes(":") ? raw.split(":")[1] : raw;

  if (raw.startsWith("BIST:")) return `${plain}.IS`;
  if (raw.startsWith("NASDAQ:")) return plain;
  if (raw.startsWith("BINANCE:")) {
    const s = plain.endsWith("USDT") ? plain.slice(0, -4) : plain;
    return `${s}-USD`;
  }

  if (/^[A-Z]{3,6}USDT$/.test(plain)) return `${plain.slice(0, -4)}-USD`;

  if (/^[A-Z0-9]{4,5}$/.test(plain)) return `${plain}.IS`;
  return plain;
}

function normalizeTf(tf: string) {
  const v = String(tf || "1D").toUpperCase();
  if (v === "1W") return { interval: "1wk", range: "5y" };
  if (v === "1M") return { interval: "1mo", range: "10y" };
  if (v === "4H") return { interval: "1h", range: "6mo" };
  if (v === "1H") return { interval: "60m", range: "3mo" };
  return { interval: "1d", range: "2y" };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "BIMAS";
  const tf = searchParams.get("tf") ?? "1D";

  const yahooSymbol = normalizeYahooSymbol(symbol);
  const { interval, range } = normalizeTf(tf);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return noStore({ ok: false, items: [], error: `upstream-${response.status}` }, { status: 502 });
    }

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    const timestamps: number[] = Array.isArray(result?.timestamp) ? result.timestamp : [];
    const quote = result?.indicators?.quote?.[0] ?? {};

    const open: Array<number | null> = Array.isArray(quote.open) ? quote.open : [];
    const high: Array<number | null> = Array.isArray(quote.high) ? quote.high : [];
    const low: Array<number | null> = Array.isArray(quote.low) ? quote.low : [];
    const close: Array<number | null> = Array.isArray(quote.close) ? quote.close : [];

    const items: Candle[] = timestamps
      .map((time, i) => ({
        time: Number(time),
        open: Number(open[i]),
        high: Number(high[i]),
        low: Number(low[i]),
        close: Number(close[i]),
      }))
      .filter(
        (c) =>
          Number.isFinite(c.time) &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close),
      );

    return noStore({ ok: true, items });
  } catch (error: any) {
    return noStore({ ok: false, items: [], error: error?.message ?? "fetch-failed" }, { status: 500 });
  }
}
