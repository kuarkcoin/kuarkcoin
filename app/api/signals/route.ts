import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type WebhookPayload = {
  secret: string;
  symbol: string;
  price: number;
  signal: "BUY" | "SELL";
  score: number;
  reasons?: string;
  t?: number;
};

type SignalInsert = {
  symbol: string;
  signal: "BUY" | "SELL";
  price: number | null;
  score: number | null;
  reasons: string | null;
  time: number | null;
};

type SignalRow = {
  id: number;
  created_at: string;
  symbol: string;
  signal: string;
  price: number | null;
  score: number | null;
  reasons: string | null;
  grade?: string | null;
  is_premium?: boolean | null;
};

type TradeRow = {
  outcome: "WIN" | "LOSS" | null;
  is_ema50_retest: boolean | null;
};

type JsonObject = Record<string, unknown>;

function noStore(json: unknown, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function clamp0to100(v: number | null): number | null {
  if (v == null) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function sanitizeReasons(v: unknown): string | null {
  const s = toStringOrNull(v);
  if (!s) return null;
  return s.replace(/[\r\n]+/g, " ").slice(0, 500).trim() || null;
}

function plainSymbol(symbol: string): string {
  const idx = symbol.indexOf(":");
  return idx >= 0 ? symbol.slice(idx + 1) : symbol;
}

function parseWebhookPayload(value: unknown): WebhookPayload | null {
  if (!isObject(value)) return null;

  const secret = toStringOrNull(value.secret);
  const symbol = toStringOrNull(value.symbol);
  const signalRaw = toStringOrNull(value.signal)?.toUpperCase();

  if (!secret || !symbol || (signalRaw !== "BUY" && signalRaw !== "SELL")) return null;

  const price = toNumberOrNull(value.price);
  const score = toNumberOrNull(value.score);
  const t = toNumberOrNull(value.t);

  return {
    secret,
    symbol,
    signal: signalRaw,
    price: price ?? Number.NaN,
    score: score ?? Number.NaN,
    reasons: toStringOrNull(value.reasons) ?? undefined,
    t: t ?? undefined,
  };
}

function resolveExpectedSecret(): string {
  const envSecret = toStringOrNull(process.env.WEBHOOK_SECRET) ?? toStringOrNull(process.env.SCAN_SECRET);
  if (envSecret) return envSecret;
  if (process.env.NODE_ENV !== "production") return "kuark_12345";
  return "";
}

async function insertSignalCompat(
  supa: ReturnType<typeof supabaseServer>,
  payload: SignalInsert,
): Promise<{ id: number | null; error: string | null }> {
  const timestampIso = payload.time != null ? new Date(payload.time).toISOString() : new Date().toISOString();

  const attempts: JsonObject[] = [
    {
      symbol: payload.symbol,
      signal: payload.signal,
      price: payload.price,
      score: payload.score,
      reasons: payload.reasons,
      time: payload.time,
      t_tv: timestampIso,
      symbol_plain: plainSymbol(payload.symbol),
    },
    {
      symbol: payload.symbol,
      signal: payload.signal,
      price: payload.price,
      score: payload.score,
      reasons: payload.reasons,
      time: payload.time,
    },
    {
      symbol: payload.symbol,
      signal: payload.signal,
      price: payload.price,
      score: payload.score,
      reasons: payload.reasons,
    },
  ];

  let lastError = "insert failed";
  for (const row of attempts) {
    const { data, error } = await supa.from("signals").insert([row]).select("id").single();
    if (!error) {
      const id = isObject(data) && typeof data.id === "number" ? data.id : null;
      return { id, error: null };
    }
    lastError = error.message;
  }

  return { id: null, error: lastError };
}

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") ?? "latest").toLowerCase();
  const limitRaw = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 50;

  if (scope === "stats") {
    const windowRaw = Number(searchParams.get("window") ?? "20");
    const window = Number.isFinite(windowRaw) ? Math.max(5, Math.min(windowRaw, 200)) : 20;

    const { data, error } = await supa
      .from("trades")
      .select("outcome,is_ema50_retest,created_at")
      .not("outcome", "is", null)
      .order("created_at", { ascending: false })
      .limit(window);

    if (error) return noStore({ ok: false, error: error.message }, { status: 500 });

    const rows = (data ?? []) as TradeRow[];
    const total = rows.length;
    const wins = rows.filter((r) => r.outcome === "WIN").length;
    const winRate = total ? Math.round((wins / total) * 100) : 0;

    const emaRows = rows.filter((r) => Boolean(r.is_ema50_retest));
    const emaTotal = emaRows.length;
    const emaWins = emaRows.filter((r) => r.outcome === "WIN").length;
    const emaWinRate = emaTotal ? Math.round((emaWins / emaTotal) * 100) : 0;

    return noStore({
      ok: true,
      window,
      total,
      wins,
      winRate,
      ema50: { total: emaTotal, wins: emaWins, winRate: emaWinRate },
    });
  }

  if (scope === "top") {
    const universe = (searchParams.get("u") ?? "").toUpperCase();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = supa
      .from("signals")
      .select("id,created_at,symbol,signal,price,score,reasons,grade,is_premium")
      .gte("created_at", since)
      .in("signal", ["BUY", "SELL"])
      .order("score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1000);

    if (universe === "BIST100") query = query.like("symbol", "BIST:%");
    if (universe === "NASDAQ100" || universe === "NASDAQ300") query = query.like("symbol", "NASDAQ:%");

    const { data, error } = await query;
    if (error) return noStore({ ok: false, error: error.message }, { status: 500 });

    const rows = (data ?? []) as SignalRow[];
    const buy = rows.filter((r) => String(r.signal).toUpperCase() === "BUY").slice(0, limit);
    const sell = rows.filter((r) => String(r.signal).toUpperCase() === "SELL").slice(0, limit);

    return noStore({ ok: true, scope: "top", data: { buy, sell } });
  }

  const { data, error } = await supa
    .from("signals")
    .select("id,created_at,symbol,signal,price,score,reasons,grade,is_premium")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return noStore({ ok: false, data: [], error: error.message }, { status: 500 });
  return noStore({ ok: true, data: (data ?? []) as SignalRow[] });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const payload = parseWebhookPayload(body);

  if (!payload) return noStore({ ok: false, error: "bad_request" }, { status: 400 });

  const expectedSecret = resolveExpectedSecret();
  if (!expectedSecret) return noStore({ ok: false, error: "server_misconfigured" }, { status: 500 });
  if (payload.secret !== expectedSecret) return noStore({ ok: false, error: "unauthorized" }, { status: 401 });

  const signalInsert: SignalInsert = {
    symbol: payload.symbol,
    signal: payload.signal,
    price: toNumberOrNull(payload.price),
    score: clamp0to100(toNumberOrNull(payload.score)),
    reasons: sanitizeReasons(payload.reasons),
    time: payload.t && Number.isFinite(payload.t) && payload.t > 0 ? Math.round(payload.t) : null,
  };

  const supa = supabaseServer();
  const { id, error } = await insertSignalCompat(supa, signalInsert);
  if (error) return noStore({ ok: false, error }, { status: 500 });

  return noStore({ ok: true, id, inserted: true });
}
