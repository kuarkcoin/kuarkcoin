// app/api/signals/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;
type EventType = "OPEN" | "CLOSE" | "SIGNAL";

function noStore(json: any, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

async function readJsonBody(req: Request) {
  const raw = await req.text();
  let body: any = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  return { raw, body };
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
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeStr(v: any) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function clamp0to100(v: number | null) {
  if (v == null || Number.isNaN(v)) return null;
  return Math.max(0, Math.min(100, v));
}

// V10 GÜNCELLEMESİ: Artık EMA50 Retest'leri "GOLDEN" sinyali olarak geliyor
function isGoldenPullback(reasons: string | null) {
  if (!reasons) return false;
  return reasons.toLowerCase().includes("golden");
}

function getIncomingSecret(req: Request, body: any) {
  const headerSecret =
    req.headers.get("x-kuark-secret") || req.headers.get("x-scan-secret") || req.headers.get("x-secret");

  const bodySecret = body?.secret;
  return String(headerSecret ?? bodySecret ?? "").trim();
}

function plainSymbol(sym: string) {
  const s = sym.trim();
  const idx = s.indexOf(":");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

function istanbulDateYmd(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
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

  const try2 = await supa.from("signals").insert([minimal]).select("id").single();
  return try2;
}



async function insertSignalCompat(supa: any, payload: any) {
  const withPayload = await safeInsertSignal(supa, payload);
  if (!withPayload.error) return withPayload;

  const fallbackPayload = { ...payload };
  delete fallbackPayload.payload;

  return safeInsertSignal(supa, fallbackPayload);
}

async function upsertDailyPrice(supa: any, symbolPlain: string, price: number | null) {
  if (price == null) return;

  const today = istanbulDateYmd();
  const { data: prev } = await supa
    .from("daily_prices")
    .select("close,date")
    .eq("symbol", symbolPlain)
    .lt("date", today)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevClose = toNumOrNull(prev?.close);
  const changePct =
    prevClose != null && prevClose !== 0 ? ((price - prevClose) / Math.abs(prevClose)) * 100 : null;

  await supa.from("daily_prices").upsert(
    [
      {
        symbol: symbolPlain,
        date: today,
        close: price,
        change_pct: changePct,
        source: "webhook",
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "symbol,date" },
  );
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

  const { data, error } = await supa.from("signals").select("*").order("created_at", { ascending: false }).limit(500);

  if (error) return noStore({ ok: false, data: [], error: error.message }, { status: 500 });
  return noStore({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { body } = await readJsonBody(req);

  if (!body) return noStore({ ok: false, error: "Bad JSON" }, { status: 400 });

  const expected = String(process.env.SCAN_SECRET ?? "").trim();
  if (!expected) return noStore({ ok: false, error: "Server misconfigured" }, { status: 500 });

  const incoming = getIncomingSecret(req, body);
  if (!incoming || incoming !== expected) {
    return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const event: EventType = String(body.event ?? "OPEN").toUpperCase() as EventType;
  const signal = String(body.signal ?? "").toUpperCase().trim();
  const symbolRaw = String(body.symbol ?? "").trim();

  if (!symbolRaw) return noStore({ ok: false, error: "Missing symbol" }, { status: 400 });

  const symbolPlain = plainSymbol(symbolRaw);
  const timeframe = normalizeStr(body.timeframe ?? body.tf);
  const score = clamp0to100(toNumOrNull(body.score));
  const grade = normalizeStr(body.grade);
  const premium = toBool(body.premium ?? body.is_premium);
  const reasons = normalizeStr(body.reasons);
  const t_tv = body.t != null || body.ts != null ? parseTvTime(body.t ?? body.ts) : new Date();

  // V10 GÜNCELLEMESİ: Yeni hedefleri yakalıyoruz
  const price = toNumOrNull(body.price);
  const entryPrice = toNumOrNull(body.entryPrice) ?? price;
  const exitPrice = toNumOrNull(body.exitPrice);
  const tp1 = toNumOrNull(body.tp1);
  const tp2 = toNumOrNull(body.tp2);
  const sl = toNumOrNull(body.sl);


  if (event !== "OPEN" && event !== "CLOSE" && event !== "SIGNAL") {
    return noStore({ ok: false, error: "Invalid event" }, { status: 400 });
  }

  if (event === "OPEN" && signal !== "BUY" && signal !== "SELL") {
    return noStore({ ok: false, error: "Missing/invalid signal for OPEN" }, { status: 400 });
  }

  await upsertDailyPrice(supa, symbolPlain, price);

  if (event === "SIGNAL") {
    const signalPayload: any = {
      symbol: symbolRaw,
      timeframe,
      signal: signal || "—",
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
      payload: body,
    };

    const ins = await insertSignalCompat(supa, signalPayload);
    if (ins.error) return noStore({ ok: false, error: "signals insert failed" }, { status: 500 });

    return noStore({ ok: true, event: "SIGNAL", signalId: ins.data?.id ?? null });
  }

  // 1) OPEN
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
      payload: body,
    };

    const ins = await insertSignalCompat(supa, signalPayload);

    if (ins.error) {
      return noStore({ ok: false, error: "signals insert failed" }, { status: 500 });
    }

    const signalId = ins.data?.id ?? null;

    try {
      // V10 GÜNCELLEMESİ: Açık trade kapatılırken dinamik WIN/LOSS hesaplama
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

  // 2) CLOSE
  if (event === "CLOSE") {
    const outcome: Outcome = body.outcome === "WIN" ? "WIN" : body.outcome === "LOSS" ? "LOSS" : null;
    const exitReason = normalizeStr(body.exitReason);

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
