// app/api/signals/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;

const SIGNAL_COLUMNS = "id, created_at, symbol, signal, price, score, reasons, outcome";
const DEFAULT_SIGNALS_LIMIT = 100;
const MAX_SIGNALS_LIMIT = 500;

function parseLimit(value: string | null) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) return DEFAULT_SIGNALS_LIMIT;
  return Math.min(limit, MAX_SIGNALS_LIMIT);
}

function isIsoTimestamp(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function istanbulDayRange(date = new Date()) {
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

function noStore(json: any, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

// TradingView t bazen seconds bazen ms gelebilir
function parseTvTime(t: any) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  // 1e12 ~ 2001-09-09 in ms. bunun altı büyük ihtimal seconds
  return new Date(n < 1e12 ? n * 1000 : n);
}

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  if (scope === "todayTop") {
    const { startUTC, endUTC } = istanbulDayRange();

    const base = () =>
      supa
        .from("signals")
        .select(SIGNAL_COLUMNS)
        .gte("created_at", startUTC.toISOString())
        .lt("created_at", endUTC.toISOString())
        .not("score", "is", null);

    const { data: topBuy, error: e1 } = await base()
      .eq("signal", "BUY")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: topSell, error: e2 } = await base()
      .eq("signal", "SELL")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (e1 || e2) {
      console.error("signals:get failed", { error: e1 ?? e2 });
      return noStore({ ok: false, data: [], error: "signals_fetch_failed" }, { status: 500 });
    }

    return noStore({ ok: true, topBuy: topBuy ?? [], topSell: topSell ?? [] });
  }

  const limit = parseLimit(searchParams.get("limit"));
  const cursor = searchParams.get("cursor")?.trim();

  let query = supa
    .from("signals")
    .select(SIGNAL_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (cursor) {
    if (isIsoTimestamp(cursor)) {
      query = query.lt("created_at", cursor);
    } else {
      const cursorId = Number(cursor);
      if (Number.isInteger(cursorId) && cursorId > 0) {
        query = query.lt("id", cursorId);
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("signals:get failed", { error });
    return noStore({ ok: false, data: [], error: "signals_fetch_failed" }, { status: 500 });
  }
  return noStore({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const supa = supabaseServer();

  const body = await req.json().catch(() => null);
  if (!body) return noStore({ ok: false, error: "Bad JSON" }, { status: 400 });

  if (body.secret !== process.env.SCAN_SECRET) {
    return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const symbol = String(body.symbol ?? "").trim();
  const signal = String(body.signal ?? "").toUpperCase().trim();
  const price = body.price == null ? null : Number(body.price);
  const score = body.score == null ? null : Number(body.score);
  const reasons = body.reasons == null ? null : String(body.reasons);
  const created_at = body.t ? parseTvTime(body.t) : new Date();

  if (!symbol || (signal !== "BUY" && signal !== "SELL")) {
    return noStore({ ok: false, error: "Missing symbol/signal" }, { status: 400 });
  }

  const { data, error } = await supa
    .from("signals")
    .insert([{ symbol, signal, price, score, reasons, created_at }])
    .select("*")
    .single();

  if (error) return noStore({ ok: false, error: error.message }, { status: 500 });
  return noStore({ ok: true, data });
}

export async function PATCH(req: Request) {
  const supa = supabaseServer();

  const body = await req.json().catch(() => null);
  if (!body) return noStore({ ok: false, error: "Bad JSON" }, { status: 400 });

  const id = Number(body.id);
  const outcome: Outcome = body.outcome === "WIN" ? "WIN" : body.outcome === "LOSS" ? "LOSS" : null;
  if (!id) return noStore({ ok: false, error: "Missing id" }, { status: 400 });

  const { data, error } = await supa
    .from("signals")
    .update({ outcome })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return noStore({ ok: false, error: error.message }, { status: 500 });
  return noStore({ ok: true, data });
}
