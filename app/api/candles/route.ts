import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CandleRow = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

function clampInt(val: string | null, fallback: number, min: number, max: number) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function normalizeFinnhubSymbol(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.includes(":")) return trimmed;
  const [prefix, rest] = trimmed.split(":");
  if (prefix === "BIST" || prefix === "BIST_DLY") {
    return `${rest}.IS`;
  }
  return trimmed;
}

function json(data: any, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const tf = (searchParams.get("tf") || "D").toUpperCase();
    const days = clampInt(searchParams.get("days"), 120, 1, 365);

    if (!symbol) {
      return json({ ok: false, error: "Missing symbol", items: [] }, { status: 400 });
    }

    const finnhubSymbol = normalizeFinnhubSymbol(symbol);
    if (!finnhubSymbol) {
      return json({ ok: false, error: "Invalid symbol", items: [] }, { status: 400 });
    }

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return json({ ok: false, error: "Missing FINNHUB_API_KEY", items: [] }, { status: 500 });
    }

    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 86400;
    const resolution = tf === "D" ? "D" : tf;

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 12_000);

    try {
      const url = new URL("https://finnhub.io/api/v1/stock/candle");
      url.searchParams.set("symbol", finnhubSymbol);
      url.searchParams.set("resolution", resolution);
      url.searchParams.set("from", String(from));
      url.searchParams.set("to", String(to));
      url.searchParams.set("token", apiKey);

      const res = await fetch(url.toString(), { cache: "no-store", signal: ac.signal });
      if (!res.ok) {
        return json({ ok: false, error: `Finnhub error: ${res.status}`, items: [] }, { status: 502 });
      }

      const payload = await res.json();
      const status = String(payload?.s ?? "");
      if (status !== "ok") {
        return json({ ok: true, items: [] });
      }

      const times = Array.isArray(payload.t) ? payload.t : [];
      const opens = Array.isArray(payload.o) ? payload.o : [];
      const highs = Array.isArray(payload.h) ? payload.h : [];
      const lows = Array.isArray(payload.l) ? payload.l : [];
      const closes = Array.isArray(payload.c) ? payload.c : [];
      const vols = Array.isArray(payload.v) ? payload.v : [];

      const items: CandleRow[] = times.map((t: number, i: number) => ({
        time: t,
        open: Number(opens[i] ?? 0),
        high: Number(highs[i] ?? 0),
        low: Number(lows[i] ?? 0),
        close: Number(closes[i] ?? 0),
        volume: vols[i] == null ? undefined : Number(vols[i]),
      }));

      return json({ ok: true, items });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    const msg = error?.name === "AbortError" ? "timeout" : (error?.message ?? "candles failed");
    return json({ ok: false, error: msg, items: [] }, { status: 500 });
  }
}
