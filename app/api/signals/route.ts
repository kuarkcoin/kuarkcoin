// app/api/signals/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { findTrackedSymbol, normalizeSymbol } from "@/data/tracked-symbols";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;

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
        .select("*")
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
      return noStore({ ok: false, topBuy: [], topSell: [], error: (e1 ?? e2)?.message }, { status: 500 });
    }

    return noStore({ ok: true, topBuy: topBuy ?? [], topSell: topSell ?? [] });
  }

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

  const body = await req.json().catch(() => null);
  if (!body) return noStore({ ok: false, error: "Bad JSON" }, { status: 400 });

  if (body.secret !== process.env.SCAN_SECRET) {
    return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const symbol = normalizeSymbol(body.symbol ?? "");
  if (!symbol) {
    return noStore({ ok: false, error: "Missing symbol" }, { status: 400 });
  }

  const signal = String(body.signal ?? "").toUpperCase().trim();
  if (signal !== "BUY" && signal !== "SELL") {
    return noStore({ ok: false, error: "Invalid signal" }, { status: 400 });
  }

  const parseFiniteNumber = (value: unknown) => {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseOptionalText = (value: unknown) => {
    if (value == null) return null;
    const parsed = String(value).trim();
    return parsed ? parsed : null;
  };

  const price = parseFiniteNumber(body.price);
  const score = parseFiniteNumber(body.score);
  const rvol = parseFiniteNumber(body.rvol);
  const reasons = parseOptionalText(body.reasons);
  const timeframe = parseOptionalText(body.timeframe);
  const source = parseOptionalText(body.source);
  const created_at = body.t ? parseTvTime(body.t) : new Date();
  const trackedSymbol = findTrackedSymbol(symbol);
  const symbolMeta = trackedSymbol ?? {
    symbol,
    name: symbol,
    type: "unknown",
    category: "Untracked",
    exchange: "Unknown",
  };

  const { data, error } = await supa
    .from("signals")
    .insert([
      {
        symbol,
        name: symbolMeta.name,
        signal,
        price,
        score,
        reasons,
        rvol,
        timeframe,
        type: symbolMeta.type,
        category: symbolMeta.category,
        exchange: symbolMeta.exchange,
        source,
        created_at,
      },
    ])
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
