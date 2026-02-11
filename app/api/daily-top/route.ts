import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getBusinessDayCutoff } from "@/lib/businessDays";
import { istanbulDayRange } from "@/lib/istanbulDay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Side = "BUY" | "SELL";

type SignalRow = {
  symbol: string;
  signal?: string | null;
  type?: string | null;
  score: number | null;
  price: number | null;
};

function noStore(json: unknown, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

function parseNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function detectSide(row: SignalRow): Side | null {
  const raw = String(row.signal ?? row.type ?? "").toUpperCase().trim();
  if (raw === "BUY" || raw === "SELL") return raw;
  return null;
}

function readSecretFromRequest(req: Request): string | null {
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret) return headerSecret;

  const url = new URL(req.url);
  return url.searchParams.get("secret");
}

async function fetchCandleCloses(symbol: string, minBarsNeeded = 11): Promise<number[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  const nowSec = Math.floor(Date.now() / 1000);
  const windows = [30, 60, 120, 240];

  for (const days of windows) {
    const fromSec = nowSec - days * 24 * 60 * 60;
    const params = new URLSearchParams({
      symbol,
      resolution: "D",
      from: String(fromSec),
      to: String(nowSec),
      token: apiKey,
    });

    try {
      const res = await fetch(`https://finnhub.io/api/v1/stock/candle?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) continue;
      const json = await res.json();
      const closes = Array.isArray(json?.c)
        ? (json.c as unknown[]).map(parseNumber).filter((n): n is number => n !== null)
        : [];

      if (closes.length >= minBarsNeeded) return closes;
      if (closes.length > 0 && days === windows[windows.length - 1]) return closes;
    } catch (error) {
      console.error("finnhub candle fetch error", { symbol, error });
    }
  }

  return [];
}

async function enrichSignal(row: SignalRow) {
  const closes = await fetchCandleCloses(row.symbol, 11);
  const fallbackClose = closes.length ? closes[closes.length - 1] : null;
  const closePrice = row.price ?? fallbackClose;
  const close10bd = closes.length > 10 ? closes[closes.length - 11] : null;

  return {
    symbol: row.symbol,
    score: row.score,
    close_price: closePrice,
    close_10bd: close10bd,
    pct_10bd:
      closePrice != null && close10bd != null && close10bd !== 0
        ? ((closePrice / close10bd) - 1) * 100
        : null,
  };
}

async function getTopSignalsForSide(
  supa: ReturnType<typeof supabaseServer>,
  side: Side,
  startIso: string,
  endIso: string
): Promise<SignalRow[]> {
  const queryByColumn = async (col: "signal" | "type") => {
    const { data, error } = await supa
      .from("signals")
      .select(`symbol, ${col}, score, price`)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .not("score", "is", null)
      .eq(col, side)
      .order("score", { ascending: false })
      .limit(40);

    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      if (!msg.includes(`column signals.${col} does not exist`)) {
        console.error("signals query error", error);
      }
      return [] as SignalRow[];
    }

    return (data ?? []).map((row: any) => ({
      symbol: String(row.symbol ?? "").trim(),
      signal: col === "signal" ? String(row.signal ?? "") : null,
      type: col === "type" ? String(row.type ?? "") : null,
      score: parseNumber(row.score),
      price: parseNumber(row.price),
    }));
  };

  const [bySignal, byType] = await Promise.all([queryByColumn("signal"), queryByColumn("type")]);
  const merged = [...bySignal, ...byType]
    .filter((row) => row.symbol && row.score !== null && detectSide(row) === side)
    .sort((a, b) => (b.score ?? -999999) - (a.score ?? -999999));

  const deduped: SignalRow[] = [];
  const seen = new Set<string>();
  for (const row of merged) {
    const key = row.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
    if (deduped.length >= 10) break;
  }

  return deduped;
}

async function runDailyTopAggregation() {
  const supa = supabaseServer();
  const { day, startUTC, endUTC } = istanbulDayRange();
  const startIso = startUTC.toISOString();
  const endIso = endUTC.toISOString();

  const [buySignals, sellSignals] = await Promise.all([
    getTopSignalsForSide(supa, "BUY", startIso, endIso),
    getTopSignalsForSide(supa, "SELL", startIso, endIso),
  ]);

  const [buyRows, sellRows] = await Promise.all([
    Promise.all(buySignals.map(enrichSignal)),
    Promise.all(sellSignals.map(enrichSignal)),
  ]);

  const payload = [
    ...buyRows.map((row) => ({ day, side: "BUY" as const, ...row })),
    ...sellRows.map((row) => ({ day, side: "SELL" as const, ...row })),
  ];

  if (payload.length) {
    const { error: upsertError } = await supa.from("daily_top_leaderboard").upsert(payload, {
      onConflict: "day,side,symbol",
    });

    if (upsertError) {
      console.error("daily_top_leaderboard upsert error", upsertError);
      return { ok: false, error: "Upsert failed", status: 500 } as const;
    }
  }

  const cutoffDay = getBusinessDayCutoff(day, 10);
  const { error: cleanupError } = await supa
    .from("daily_top_leaderboard")
    .delete()
    .lt("day", cutoffDay);

  if (cleanupError) {
    console.error("daily_top_leaderboard cleanup error", cleanupError);
  }

  return {
    ok: true,
    day,
    buyCount: buyRows.length,
    sellCount: sellRows.length,
    cutoffDay,
  } as const;
}

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const receivedSecret = readSecretFromRequest(req);

  if (!cronSecret || receivedSecret !== cronSecret) {
    return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyTopAggregation();
  if (!result.ok) {
    return noStore(result, { status: result.status });
  }

  return noStore(result);
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Vercel Cron varsayılanı GET olduğu için, `?run=1&secret=...` ile aggregation tetiklemeyi de destekliyoruz.
  if (url.searchParams.get("run") === "1") {
    const cronSecret = process.env.CRON_SECRET;
    const receivedSecret = readSecretFromRequest(req);

    if (!cronSecret || receivedSecret !== cronSecret) {
      return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await runDailyTopAggregation();
    if (!result.ok) {
      return noStore(result, { status: result.status });
    }

    return noStore(result);
  }

  const supa = supabaseServer();
  const { day } = istanbulDayRange();
  const cutoffDay = getBusinessDayCutoff(day, 10);

  const { data, error } = await supa
    .from("daily_top_leaderboard")
    .select("day, side, symbol, score, close_price, close_10bd, pct_10bd, created_at")
    .gte("day", cutoffDay)
    .order("day", { ascending: false })
    .order("score", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("daily_top_leaderboard get error", error);
    return noStore({ ok: false, data: [], error: error.message }, { status: 500 });
  }

  return noStore({ ok: true, data: data ?? [] });
}
