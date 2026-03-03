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
  t?: number; // TradingView time (ms)
  event?: "OPEN" | "CLOSE" | string;
};

type SignalInsert = {
  symbol: string;
  signal: "BUY" | "SELL";
  price: number | null;
  score: number | null;
  reasons: string | null;
  time: number | null;
};

type TradeRow = {
  id?: number;
  outcome: "WIN" | "LOSS" | null;
  is_ema50_retest: boolean | null;
  created_at?: string;
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

  const eventRaw = toStringOrNull(value.event)?.toUpperCase() ?? undefined;

  return {
    secret,
    symbol,
    signal: signalRaw,
    price: price ?? Number.NaN,
    score: score ?? Number.NaN,
    reasons: toStringOrNull(value.reasons) ?? undefined,
    t: t ?? undefined,
    event: eventRaw,
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

// --- trades compat helpers ---
async function insertTradeOpenCompat(supa: ReturnType<typeof supabaseServer>, p: {
  symbol: string; side: "BUY" | "SELL"; entry: number | null; t: number | null;
}) {
  const tsIso = p.t != null ? new Date(p.t).toISOString() : new Date().toISOString();
  const symbolPlain = plainSymbol(p.symbol);

  const attempts: JsonObject[] = [
    // en zengin deneme
    {
      symbol: p.symbol,
      symbol_plain: symbolPlain,
      side: p.side,
      status: "OPEN",
      entry_price: p.entry,
      entry: p.entry,
      price: p.entry,
      opened_at: tsIso,
      time: p.t,
      outcome: null,
      is_ema50_retest: null,
    },
    // daha minimal
    {
      symbol: p.symbol,
      side: p.side,
      entry_price: p.entry,
      outcome: null,
      is_ema50_retest: null,
    },
    // sadece required’lar (stats için outcome/is_ema50_retest/created_at zaten default olabilir)
    {
      symbol: p.symbol,
      outcome: null,
      is_ema50_retest: null,
    },
  ];

  for (const row of attempts) {
    const { error } = await supa.from("trades").insert([row]);
    if (!error) return { ok: true as const };
  }
  return { ok: false as const };
}

async function closeLatestTradeCompat(supa: ReturnType<typeof supabaseServer>, p: {
  symbol: string; side: "BUY" | "SELL"; exit: number | null; t: number | null;
}) {
  // Açık trade’i bulmayı dene (şema farklı olabilir diye çoklu deneme)
  const symbolPlain = plainSymbol(p.symbol);
  const tsIso = p.t != null ? new Date(p.t).toISOString() : new Date().toISOString();

  const selectors = [
    supa.from("trades").select("id,entry_price,entry,side,status,outcome,created_at").eq("symbol", p.symbol).is("outcome", null).order("created_at", { ascending: false }).limit(1),
    supa.from("trades").select("id,entry_price,entry,side,status,outcome,created_at").eq("symbol_plain", symbolPlain).is("outcome", null).order("created_at", { ascending: false }).limit(1),
  ];

  let trade: any = null;
  for (const q of selectors) {
    const { data, error } = await q;
    if (!error && Array.isArray(data) && data.length) {
      trade = data[0];
      break;
    }
  }
  if (!trade || typeof trade.id !== "number") return { ok: false as const, reason: "no-open-trade" as const };

  const entry = toNumberOrNull(trade.entry_price) ?? toNumberOrNull(trade.entry);
  const exit = p.exit;

  let outcome: "WIN" | "LOSS" | null = null;
  if (entry != null && exit != null) {
    if (p.side === "BUY") outcome = exit > entry ? "WIN" : "LOSS";
    else outcome = exit < entry ? "WIN" : "LOSS";
  }

  const updateAttempts: JsonObject[] = [
    { status: "CLOSE", exit_price: exit, exit, closed_at: tsIso, outcome },
    { exit_price: exit, outcome },
    { outcome },
  ];

  for (const patch of updateAttempts) {
    const { error } = await supa.from("trades").update(patch).eq("id", trade.id);
    if (!error) return { ok: true as const };
  }

  return { ok: false as const, reason: "update-failed" as const };
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

  // default: latest
  const { data, error } = await supa
    .from("signals")
    .select("id,created_at,symbol,signal,price,score,reasons,grade,is_premium")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return noStore({ ok: false, error: error.message }, { status: 500 });
  return noStore({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const supa = supabaseServer();

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return noStore({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const payload = parseWebhookPayload(body);
  if (!payload) return noStore({ ok: false, error: "bad payload" }, { status: 400 });

  const expected = resolveExpectedSecret();
  if (!expected) return noStore({ ok: false, error: "server secret not set" }, { status: 500 });
  if (payload.secret !== expected) return noStore({ ok: false, error: "unauthorized" }, { status: 401 });

  const timeMs = payload.t != null ? payload.t : null;

  // 1) Signals insert (always)
  const insert: SignalInsert = {
    symbol: payload.symbol,
    signal: payload.signal,
    price: toNumberOrNull(payload.price),
    score: clamp0to100(toNumberOrNull(payload.score)),
    reasons: sanitizeReasons(payload.reasons),
    time: timeMs,
  };

  const sRes = await insertSignalCompat(supa, insert);
  if (sRes.error) {
    return noStore({ ok: false, error: sRes.error }, { status: 500 });
  }

  // 2) Trades (optional, based on event)
  const ev = (payload.event ?? "").toUpperCase();
  if (ev === "OPEN") {
    await insertTradeOpenCompat(supa, {
      symbol: payload.symbol,
      side: payload.signal,
      entry: toNumberOrNull(payload.price),
      t: timeMs,
    });
  } else if (ev === "CLOSE") {
    await closeLatestTradeCompat(supa, {
      symbol: payload.symbol,
      side: payload.signal,
      exit: toNumberOrNull(payload.price),
      t: timeMs,
    });
  }

  return noStore({ ok: true, id: sRes.id, event: ev || null });
}
