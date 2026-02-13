// app/api/signals/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;
type EventType = "OPEN" | "CLOSE";

function noStore(json: any, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

function pick(obj: any, keys: string[]) {
  const out: any = {};
  for (const k of keys) out[k] = obj?.[k];
  return out;
}

function parseTvTime(t: any) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n < 1e12 ? n * 1000 : n);
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
  const s = String(v);
  return s.length ? s : null;
}

function containsEMA50Retest(reasons: string | null) {
  if (!reasons) return false;
  const s = reasons.toLowerCase();
  return s.includes("ema50") && (s.includes("retest") || s.includes("rtest"));
}

// ✅ Secret doğrulama: ENV + opsiyonel payload secret + opsiyonel header
function getSecretFromReq(req: Request, body: any) {
  const headerSecret =
    req.headers.get("x-kuark-secret") ||
    req.headers.get("x-scan-secret") ||
    req.headers.get("x-secret");

  const bodySecret = body?.secret;
  return { headerSecret, bodySecret };
}

function safeShort(v: any) {
  return String(v ?? "").slice(0, 24);
}

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "";

  // ✅ Son 20 trade win-rate + EMA50 retest win-rate
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
    const wins = rows.filter((r) => r.outcome === "WIN").length;
    const winRate = total ? Math.round((wins / total) * 100) : 0;

    const emaRows = rows.filter((r) => r.is_ema50_retest);
    const emaTotal = emaRows.length;
    const emaWins = emaRows.filter((r) => r.outcome === "WIN").length;
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

  // default: son sinyaller
  const { data, error } = await supa
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return noStore({ ok: false, data: [], error: error.message }, { status: 500 });
  return noStore({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const supa = supabaseServer();

  const { raw, body } = await readJsonBody(req);

  // 🔥 DEBUG: gelen payload
  console.log("[/api/signals] RAW:", raw.slice(0, 800));
  console.log("[/api/signals] BODY_KEYS:", body ? Object.keys(body) : null);
  console.log(
    "[/api/signals] BODY_PICK:",
    body ? pick(body, ["secret", "event", "symbol", "signal", "score", "grade", "premium", "is_premium", "t", "timeframe", "price", "entryPrice", "exitPrice", "outcome"]) : null
  );

  if (!body) {
    return noStore({ ok: false, error: "Bad JSON", raw: raw.slice(0, 400) }, { status: 400 });
  }

  // ✅ Secret check (ENV ile birebir)
  const envSecret = process.env.SCAN_SECRET;
  const { headerSecret, bodySecret } = getSecretFromReq(req, body);

  const incoming = (headerSecret ?? bodySecret ?? "").toString().trim();
  const expected = (envSecret ?? "").toString().trim();

  if (!expected) {
    console.log("[/api/signals] CONFIG ERROR: SCAN_SECRET env is missing");
    return noStore({ ok: false, error: "Server misconfigured: SCAN_SECRET missing" }, { status: 500 });
  }

  if (!incoming || incoming !== expected) {
    console.log(
      "[/api/signals] UNAUTHORIZED",
      "incoming=",
      safeShort(incoming),
      "expected=",
      safeShort(expected),
      "headerSecret=",
      safeShort(headerSecret),
      "bodySecret=",
      safeShort(bodySecret)
    );
    return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const event: EventType = String(body.event ?? "OPEN").toUpperCase() as EventType;
  const symbol = String(body.symbol ?? "").trim();
  const signal = String(body.signal ?? "").toUpperCase().trim(); // BUY/SELL (OPEN için)
  const timeframe = normalizeStr(body.timeframe);

  const score = toNumOrNull(body.score);
  const grade = normalizeStr(body.grade);
  const premium = toBool(body.premium ?? body.is_premium);
  const reasons = normalizeStr(body.reasons);

  const t_tv = body.t ? parseTvTime(body.t) : new Date();

  const price = toNumOrNull(body.price);
  const entryPrice = toNumOrNull(body.entryPrice) ?? price;
  const exitPrice = toNumOrNull(body.exitPrice);

  if (!symbol) return noStore({ ok: false, error: "Missing symbol" }, { status: 400 });

  // 1) OPEN: signals insert + open trade insert
  if (event === "OPEN") {
    if (signal !== "BUY" && signal !== "SELL") {
      return noStore({ ok: false, error: "Missing/invalid signal for OPEN" }, { status: 400 });
    }

    // signals kaydı
    const { data: sig, error: e1 } = await supa
      .from("signals")
      .insert([
        {
          symbol,
          timeframe,
          signal,
          price,
          score,
          grade,
          is_premium: premium,
          reasons,
          t_tv: t_tv.toISOString(),
        },
      ])
      .select("id")
      .single();

    if (e1) {
      console.log("[/api/signals] signals insert error:", e1);
      return noStore({ ok: false, error: e1.message }, { status: 500 });
    }

    // aynı sembolde açık trade varsa kapat (opsiyonel güvenlik)
    const { error: eAutoClose } = await supa
      .from("trades")
      .update({ exit_time: t_tv.toISOString(), exit_reason: "NewSignalAutoClose" })
      .eq("symbol", symbol)
      .is("exit_time", null);

    if (eAutoClose) console.log("[/api/signals] trades auto-close warn:", eAutoClose);

    const direction = signal === "BUY" ? "LONG" : "SHORT";
    const isEma50 = containsEMA50Retest(reasons);

    const { data: tr, error: e2 } = await supa
      .from("trades")
      .insert([
        {
          symbol,
          timeframe,
          direction,
          entry_time: t_tv.toISOString(),
          entry_price: entryPrice,
          entry_signal_id: sig?.id ?? null,
          is_premium: premium,
          grade,
          score,
          reasons,
          is_ema50_retest: isEma50,
        },
      ])
      .select("id")
      .single();

    if (e2) {
      console.log("[/api/signals] trades insert error:", e2);
      return noStore({ ok: false, error: e2.message }, { status: 500 });
    }

    return noStore({ ok: true, event: "OPEN", signalId: sig?.id, tradeId: tr?.id });
  }

  // 2) CLOSE: son açık trade'i bul kapat + outcome yaz
  if (event === "CLOSE") {
    const outcome: Outcome =
      body.outcome === "WIN" ? "WIN" : body.outcome === "LOSS" ? "LOSS" : null;

    const exitReason = normalizeStr(body.exitReason);

    const { data: openTrade, error: eFind } = await supa
      .from("trades")
      .select("id, direction, entry_price")
      .eq("symbol", symbol)
      .is("exit_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eFind) return noStore({ ok: false, error: eFind.message }, { status: 500 });
    if (!openTrade) return noStore({ ok: false, error: "No open trade for symbol" }, { status: 404 });

    // outcome yoksa entry/exit ile hesap
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