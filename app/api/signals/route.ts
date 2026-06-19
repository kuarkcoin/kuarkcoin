// app/api/signals/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { safeCompareSecret } from "@/lib/server/security";
import { parseSignalJson, SIGNALS_BODY_LIMIT_BYTES } from "@/lib/server/signalsValidation";

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

function buildDedupeKey({
  symbol,
  signal,
  created_at,
  price,
  score,
}: {
  symbol: string;
  signal: "BUY" | "SELL";
  created_at: Date;
  price: number | null;
  score: number | null;
}) {
  const createdAtMinute = new Date(created_at);
  createdAtMinute.setUTCSeconds(0, 0);

  return [symbol, signal, createdAtMinute.toISOString(), price ?? "null", score ?? "null"].join("|");
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

  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > SIGNALS_BODY_LIMIT_BYTES) {
    return noStore({ ok: false, error: "Payload too large" }, { status: 413 });
  }

  const parsed = parseSignalJson(rawBody);
  if ("error" in parsed) return noStore({ ok: false, error: parsed.error }, { status: 400 });

  if (!safeCompareSecret(parsed.data.secret, process.env.SCAN_SECRET)) {
    return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { symbol, signal, price, score, reasons, t } = parsed.data;
  const created_at = t ? parseTvTime(t) : new Date();
  const dedupe_key = buildDedupeKey({ symbol, signal, created_at, price, score });

  const { data, error } = await supa
    .from("signals")
    .insert([{ symbol, signal, price, score, reasons, created_at, dedupe_key }])
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return noStore({ ok: true, duplicate: true });
    }

    console.error("Signal insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      dedupe_key,
    });
    return noStore({ ok: false, error: "Signal insert failed" }, { status: 500 });
  }

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
