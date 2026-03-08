import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;
type EventType = "OPEN" | "CLOSE";

type TradingViewTextPayload = {
  event: "OPEN";
  signal: "BUY" | "SELL";
  symbol: string;
  score: number | null;
  reasons: string;
  t: number;
};

const BUY_ALIASES = new Set(["BUY", "AL", "LONG"]);
const SELL_ALIASES = new Set(["SELL", "SAT", "SHORT"]);

function noStore(json: any, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

async function readBody(req: Request) {
  const raw = (await req.text()).trim();
  if (!raw) return { raw: "", body: null };

  try {
    return { raw, body: JSON.parse(raw) };
  } catch {
    return { raw, body: null };
  }
}

function parseTvTime(t: any) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n < 1e12 ? n * 1000 : n);
}

function toBool(v: any) {
  if (v === true || v === false) return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return false;
}

function toNumOrNull(v: any) {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeStr(v: any) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function isGoldenPullback(reasons: string | null) {
  if (!reasons) return false;
  return reasons.toLowerCase().includes("golden");
}

function getIncomingSecret(req: Request, body: any) {
  const headerSecret =
    req.headers.get("x-kuark-secret") || req.headers.get("x-scan-secret") || req.headers.get("x-secret");

  const bodySecret = body?.secret ?? body?.token ?? body?.webhook_secret;
  return String(headerSecret ?? bodySecret ?? "").trim();
}

function normalizeSignal(raw: any): "BUY" | "SELL" | null {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (BUY_ALIASES.has(s)) return "BUY";
  if (SELL_ALIASES.has(s)) return "SELL";
  return null;
}

function normalizeReasons(raw: any): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    return s.length ? s : null;
  }

  if (Array.isArray(raw)) {
    const list = raw
      .map((x) => normalizeStr(x))
      .filter((x): x is string => Boolean(x));
    return list.length ? list.join(",") : null;
  }

  try {
    return JSON.stringify(raw);
  } catch {
    return null;
  }
}

function normalizeSymbolInput(raw: any): string {
  const symbol = String(raw ?? "")
    .trim()
    .toUpperCase();
  return symbol;
}

function plainSymbol(sym: string) {
  const s = sym.trim();
  const idx = s.indexOf(":");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

function parseSymbolFromText(raw: string) {
  const fromSinyal = raw.match(/Sinyali:\s*([A-Z0-9:._-]+)/i)?.[1];
  if (fromSinyal) return fromSinyal.toUpperCase();

  const fromWord = raw.match(/\b(BIST|NASDAQ|BINANCE|CRYPTO):([A-Z0-9._-]+)\b/i);
  if (fromWord) return `${fromWord[1].toUpperCase()}:${fromWord[2].toUpperCase()}`;

  return null;
}

function parseTradingViewTextAlert(raw: string): TradingViewTextPayload | null {
  if (!raw) return null;

  const upper = raw.toUpperCase();
  const isBuy = upper.includes("AL SİNYAL") || upper.includes("AL SINYAL") || upper.includes("BOĞA") || upper.includes("BOGA");
  const isSell = upper.includes("SAT SİNYAL") || upper.includes("SAT SINYAL");

  if (!isBuy && !isSell) return null;

  const symbol = parseSymbolFromText(raw);
  if (!symbol) return null;

  const scoreText = raw.match(/Toplam\s+(?:AL|SAT)\s+Puan:\s*([0-9]+(?:[.,][0-9]+)?)/i)?.[1] ?? null;
  const score = scoreText ? Number(scoreText.replace(",", ".")) : null;

  return {
    event: "OPEN",
    signal: isSell ? "SELL" : "BUY",
    symbol,
    score: Number.isFinite(score ?? NaN) ? score : null,
    reasons: raw,
    t: Math.floor(Date.now() / 1000),
  };
}

async function safeInsertSignal(supa: any, payload: any) {
  const try1 = await supa.from("signals").insert([payload]).select("id").single();
  if (!try1.error) return try1;

  const minimal: any = {
    symbol: payload.symbol,
    signal: payload.signal,
    score: payload.score ?? null,
    reasons: payload.reasons ?? null,
    t_tv: payload.t_tv ?? new Date().toISOString(),
    timeframe: payload.timeframe ?? null,
    is_premium: payload.is_premium ?? false,
    grade: payload.grade ?? null,
  };

  return supa.from("signals").insert([minimal]).select("id").single();
}

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "";

  if (scope === "stats") {
    const window = Number(searchParams.get("window") ?? "20");
    const w = Number.isFinite(window) ? Math.max(5, Math.min(window, 200)) : 20;

    const { data: trades, error } = await supa
      .from("trades")
      .select("outcome,is_ema50_retest,created_at")
      .not("outcome", "is", null)
      .order("created_at", { ascending: false })
      .limit(w);

    if (error) return noStore({ ok: false, error: error.message }, { status: 500 });

    const rows = trades ?? [];
    const total = rows.length;
    const wins = rows.filter((r: any) => r.outcome === "WIN").length;
    const winRate = total ? Math.round((wins / total) * 100) : 0;

    const emaRows = rows.filter((r: any) => r.is_ema50_retest);
    const emaTotal = emaRows.length;
    const emaWins = emaRows.filter((r: any) => r.outcome === "WIN").length;
    const emaWinRate = emaTotal ? Math.round((emaWins / emaTotal) * 100) : 0;

    return noStore({
      ok: true,
      window: w,
      total,
      wins,
      winRate,
      ema50: { total: emaTotal, wins: emaWins, winRate: emaWinRate },
    });
  }

  const symbolParam = normalizeStr(searchParams.get("symbol"));
  const symbolUpper = symbolParam?.toUpperCase() ?? null;
  const symbolPlainUpper = symbolUpper ? plainSymbol(symbolUpper) : null;

  const limitParam = Number(searchParams.get("limit") ?? "500");
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 1000)) : 500;

  let query = supa.from("signals").select("*").order("created_at", { ascending: false }).limit(limit);

  if (symbolUpper) {
    query = query.or(`symbol.eq.${symbolUpper},symbol_plain.eq.${symbolPlainUpper}`);
  }

  const { data, error } = await query;

  if (error) return noStore({ ok: false, data: [], error: error.message }, { status: 500 });
  return noStore({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { raw, body } = await readBody(req);

  const bodyFromMessage =
    body && typeof body?.message === "string"
      ? (() => {
          try {
            return JSON.parse(body.message);
          } catch {
            return null;
          }
        })()
      : null;

  const expected = String(process.env.SCAN_SECRET ?? "").trim();
  if (!expected) return noStore({ ok: false, error: "Server misconfigured" }, { status: 500 });

  const parsedTextAlert = !body ? parseTradingViewTextAlert(raw) : null;
  const payload = bodyFromMessage ?? body ?? parsedTextAlert;

  if (!payload) {
    return noStore(
      {
        ok: false,
        error: "Bad payload",
        hint: "Send JSON payload or TradingView alert text that includes symbol and AL/SAT signal.",
      },
      { status: 400 },
    );
  }

  const incoming = getIncomingSecret(req, payload);
  if (!incoming || incoming !== expected) {
    return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const event: EventType = String(payload.event ?? "OPEN").toUpperCase() as EventType;
  const signal = normalizeSignal(payload.signal ?? payload.side ?? payload.action);
  const symbolRaw = normalizeSymbolInput(payload.symbol ?? payload.tickerid ?? payload.ticker);

  if (!symbolRaw) return noStore({ ok: false, error: "Missing symbol" }, { status: 400 });

  const symbolPlain = plainSymbol(symbolRaw);
  const timeframe = normalizeStr(payload.timeframe);
  const score = toNumOrNull(payload.score);
  const grade = normalizeStr(payload.grade);
  const premium = toBool(payload.premium ?? payload.is_premium);
  const reasons = normalizeReasons(payload.reasons ?? payload.reason);
  const t_tv = payload.t ? parseTvTime(payload.t) : new Date();

  const price = toNumOrNull(payload.price);
  const entryPrice = toNumOrNull(payload.entryPrice) ?? price;
  const exitPrice = toNumOrNull(payload.exitPrice);
  const tp1 = toNumOrNull(payload.tp1);
  const tp2 = toNumOrNull(payload.tp2);
  const sl = toNumOrNull(payload.sl);

  if (event === "OPEN" && !signal) {
    return noStore({ ok: false, error: "Missing/invalid signal for OPEN" }, { status: 400 });
  }

  if (event === "OPEN") {
    const signalPayload: any = {
      symbol: symbolRaw,
      timeframe,
      signal,
      score,
      grade,
      is_premium: premium,
      reasons,
      t_tv: t_tv.toISOString(),
      price,
      tp1,
      tp2,
      sl,
      symbol_plain: symbolPlain,
    };

    const ins = await safeInsertSignal(supa, signalPayload);
    if (ins.error) return noStore({ ok: false, error: "signals insert failed" }, { status: 500 });

    const signalId = ins.data?.id ?? null;

    try {
      const { data: openTrade } = await supa
        .from("trades")
        .select("id, direction, entry_price")
        .eq("symbol", symbolRaw)
        .is("exit_time", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openTrade) {
        let autoOutcome: Outcome = null;
        if (openTrade.entry_price != null && price != null) {
          if (openTrade.direction === "LONG") autoOutcome = price > openTrade.entry_price ? "WIN" : "LOSS";
          if (openTrade.direction === "SHORT") autoOutcome = price < openTrade.entry_price ? "WIN" : "LOSS";
        }

        await supa
          .from("trades")
          .update({
            exit_time: t_tv.toISOString(),
            exit_reason: "NewSignalAutoClose",
            exit_price: price,
            outcome: autoOutcome,
          })
          .eq("id", openTrade.id);
      }

      const direction = signal === "BUY" ? "LONG" : "SHORT";
      const isEma50 = isGoldenPullback(reasons);

      const trIns = await supa
        .from("trades")
        .insert([
          {
            symbol: symbolRaw,
            timeframe,
            direction,
            entry_time: t_tv.toISOString(),
            entry_price: entryPrice,
            entry_signal_id: signalId,
            is_premium: premium,
            grade,
            score,
            reasons,
            is_ema50_retest: isEma50,
            tp1,
            tp2,
            sl,
          },
        ])
        .select("id")
        .single();

      return noStore({ ok: true, event: "OPEN", signalId, tradeId: trIns.data?.id ?? null });
    } catch {
      return noStore({ ok: true, event: "OPEN", signalId, tradeId: null, tradeWarn: true });
    }
  }

  if (event === "CLOSE") {
    const outcome: Outcome = payload.outcome === "WIN" ? "WIN" : payload.outcome === "LOSS" ? "LOSS" : null;
    const exitReason = normalizeStr(payload.exitReason);

    const { data: openTrade, error: eFind } = await supa
      .from("trades")
      .select("id, direction, entry_price")
      .eq("symbol", symbolRaw)
      .is("exit_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eFind) return noStore({ ok: false, error: eFind.message }, { status: 500 });
    if (!openTrade) return noStore({ ok: false, error: "No open trade for symbol" }, { status: 404 });

    let finalOutcome: Outcome = outcome;
    const ep = toNumOrNull(openTrade.entry_price);
    const xp = exitPrice;

    if (!finalOutcome && ep != null && xp != null) {
      if (openTrade.direction === "LONG") finalOutcome = xp > ep ? "WIN" : "LOSS";
      if (openTrade.direction === "SHORT") finalOutcome = xp < ep ? "WIN" : "LOSS";
    }

    const { data: closed, error: eClose } = await supa
      .from("trades")
      .update({
        exit_time: t_tv.toISOString(),
        exit_price: xp,
        outcome: finalOutcome,
        exit_reason: exitReason,
      })
      .eq("id", openTrade.id)
      .select("*")
      .single();

    if (eClose) return noStore({ ok: false, error: eClose.message }, { status: 500 });
    return noStore({ ok: true, event: "CLOSE", data: closed });
  }

  return noStore({ ok: false, error: "Invalid event" }, { status: 400 });
}
