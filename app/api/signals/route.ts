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

function parseTvTime(t: any) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n < 1e12 ? n * 1000 : n);
}

async function readJsonBody(req: Request) {
  const raw = await req.text();
  let body: any = null;
  try { body = JSON.parse(raw); } catch { body = null; }
  return { raw, body };
}

function toBool(v: any) {
  if (v === true || v === false) return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return false;
}

function containsEMA50Retest(reasons: string | null) {
  if (!reasons) return false;
  const s = reasons.toLowerCase();
  return s.includes("ema50") && (s.includes("retest") || s.includes("rtest"));
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

    if (error) return noStore({ ok:false, error:error.message }, { status: 500 });

    const rows = trades ?? [];
    const total = rows.length;
    const wins = rows.filter(r => r.outcome === "WIN").length;
    const winRate = total ? Math.round((wins / total) * 100) : 0;

    const emaRows = rows.filter(r => r.is_ema50_retest);
    const emaTotal = emaRows.length;
    const emaWins = emaRows.filter(r => r.outcome === "WIN").length;
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

  if (error) return noStore({ ok:false, data:[], error:error.message }, { status: 500 });
  return noStore({ ok:true, data: data ?? [] });
}

export async function POST(req: Request) {
  const supa = supabaseServer();

  const { raw, body } = await readJsonBody(req);
  if (!body) {
    return noStore({ ok:false, error:"Bad JSON", raw: raw.slice(0,200) }, { status: 400 });
  }

  if (body.secret !== process.env.SCAN_SECRET) {
    return noStore({ ok:false, error:"Unauthorized" }, { status: 401 });
  }

  const event: EventType = (String(body.event ?? "OPEN").toUpperCase() as EventType);
  const symbol = String(body.symbol ?? "").trim();
  const signal = String(body.signal ?? "").toUpperCase().trim(); // BUY/SELL (OPEN için)
  const timeframe = body.timeframe == null ? null : String(body.timeframe);

  const score = body.score == null ? null : Number(body.score);
  const grade = body.grade == null ? null : String(body.grade);
  const premium = toBool(body.premium ?? body.is_premium);
  const reasons = body.reasons == null ? null : String(body.reasons);

  const t_tv = body.t ? parseTvTime(body.t) : new Date();

  const price = body.price == null ? null : Number(body.price);
  const entryPrice = body.entryPrice == null ? (Number.isFinite(price!) ? price : null) : Number(body.entryPrice);
  const exitPrice = body.exitPrice == null ? null : Number(body.exitPrice);

  if (!symbol) return noStore({ ok:false, error:"Missing symbol" }, { status: 400 });

  // 1) OPEN: signals insert + open trade insert
  if (event === "OPEN") {
    if (signal !== "BUY" && signal !== "SELL") {
      return noStore({ ok:false, error:"Missing/invalid signal for OPEN" }, { status: 400 });
    }

    // signals kaydı
    const { data: sig, error: e1 } = await supa
      .from("signals")
      .insert([{
        symbol,
        timeframe,
        signal,
        score: Number.isFinite(score as number) ? score : null,
        grade,
        is_premium: premium,
        reasons,
        t_tv: t_tv.toISOString(),
      }])
      .select("id")
      .single();

    if (e1) return noStore({ ok:false, error:e1.message }, { status: 500 });

    // aynı sembolde açık trade varsa (exit_time null) istersen kapatabilirsin.
    // burada “tek trade açık kalsın” diye güvenli kapatma yapıyoruz:
    await supa
      .from("trades")
      .update({ exit_time: t_tv.toISOString(), exit_reason: "NewSignalAutoClose" })
      .eq("symbol", symbol)
      .is("exit_time", null);

    const direction = signal === "BUY" ? "LONG" : "SHORT";
    const isEma50 = containsEMA50Retest(reasons);

    const { data: tr, error: e2 } = await supa
      .from("trades")
      .insert([{
        symbol,
        timeframe,
        direction,
        entry_time: t_tv.toISOString(),
        entry_price: Number.isFinite(entryPrice as number) ? entryPrice : null,
        entry_signal_id: sig?.id ?? null,
        is_premium: premium,
        grade,
        score: Number.isFinite(score as number) ? score : null,
        reasons,
        is_ema50_retest: isEma50,
      }])
      .select("id")
      .single();

    if (e2) return noStore({ ok:false, error:e2.message }, { status: 500 });

    return noStore({ ok:true, event:"OPEN", signalId: sig?.id, tradeId: tr?.id });
  }

  // 2) CLOSE: son açık trade'i bul kapat + outcome yaz
  if (event === "CLOSE") {
    const outcome: Outcome =
      body.outcome === "WIN" ? "WIN" : body.outcome === "LOSS" ? "LOSS" : null;

    const exitReason = body.exitReason == null ? null : String(body.exitReason);

    // açık trade’i bul
    const { data: openTrade, error: eFind } = await supa
      .from("trades")
      .select("id, direction, entry_price")
      .eq("symbol", symbol)
      .is("exit_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eFind) return noStore({ ok:false, error:eFind.message }, { status: 500 });
    if (!openTrade) return noStore({ ok:false, error:"No open trade for symbol" }, { status: 404 });

    // outcome yoksa web’de basit hesap (entry/exit varsa):
    let finalOutcome: Outcome = outcome;
    const ep = openTrade.entry_price == null ? null : Number(openTrade.entry_price);
    const xp = Number.isFinite(exitPrice as number) ? (exitPrice as number) : null;

    if (!finalOutcome && ep != null && xp != null) {
      if (openTrade.direction === "LONG") finalOutcome = (xp > ep) ? "WIN" : "LOSS";
      if (openTrade.direction === "SHORT") finalOutcome = (xp < ep) ? "WIN" : "LOSS";
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

    if (eClose) return noStore({ ok:false, error:eClose.message }, { status: 500 });

    return noStore({ ok:true, event:"CLOSE", data: closed });
  }

  return noStore({ ok:false, error:"Invalid event" }, { status: 400 });
}
