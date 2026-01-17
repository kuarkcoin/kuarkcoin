import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Outcome = "WIN" | "LOSS" | null;

function istanbulDayRange(date = new Date()) {
  // TR sabit UTC+3
  const tzOffsetMs = 3 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + tzOffsetMs);

  const startLocal = new Date(local);
  startLocal.setHours(0, 0, 0, 0);

  const endLocal = new Date(startLocal);
  endLocal.setDate(endLocal.getDate() + 1);

  const startUTC = new Date(startLocal.getTime() - tzOffsetMs);
  const endUTC = new Date(endLocal.getTime() - tzOffsetMs);

  return { startUTC, endUTC };
}

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  // ✅ Günlük Top5
  if (scope === "todayTop") {
    const { startUTC, endUTC } = istanbulDayRange();

    const base = supa
      .from("signals")
      .select("*")
      .gte("created_at", startUTC.toISOString())
      .lt("created_at", endUTC.toISOString())
      .not("score", "is", null);

    const { data: topBuy, error: e1 } = await base
      .eq("signal", "BUY")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: topSell, error: e2 } = await base
      .eq("signal", "SELL")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (e1 || e2) {
      return NextResponse.json({ topBuy: [], topSell: [], error: (e1 ?? e2)?.message }, { status: 500 });
    }

    return NextResponse.json({ topBuy: topBuy ?? [], topSell: topSell ?? [] });
  }

  // ✅ Normal liste (newest-first)
  const { data, error } = await supa
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ data: [], error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supa = supabaseServer();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

  // ✅ Secret kontrol
  if (body.secret !== process.env.SCAN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Beklenen payload (TradingView webhook):
  // { secret, symbol, signal, price, score, reasons, t }
  const symbol = String(body.symbol ?? "").trim();
  const signal = String(body.signal ?? "").toUpperCase().trim();
  const price = body.price == null ? null : Number(body.price);
  const score = body.score == null ? null : Number(body.score);
  const reasons = body.reasons == null ? null : String(body.reasons);
  const created_at = body.t ? new Date(Number(body.t)) : new Date(); // Pine time(ms) gelirse

  if (!symbol || (signal !== "BUY" && signal !== "SELL")) {
    return NextResponse.json({ error: "Missing symbol/signal" }, { status: 400 });
  }

  const { data, error } = await supa
    .from("signals")
    .insert([{ symbol, signal, price, score, reasons, created_at }])
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: Request) {
  const supa = supabaseServer();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

  const id = Number(body.id);
  const outcome: Outcome = body.outcome === "WIN" ? "WIN" : body.outcome === "LOSS" ? "LOSS" : null;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supa
    .from("signals")
    .update({ outcome })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
