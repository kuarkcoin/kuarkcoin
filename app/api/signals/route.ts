// app/api/signals/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger, requestId } from "@/lib/logging/logger";
import { clientIp, rateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";

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
  const startedAt = Date.now();
  const reqId = requestId(req);
  const route = "/api/signals";
  const limit = await rateLimit({
    key: `signals:post:${clientIp(req)}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    logger.warn({ requestId: reqId, route, status: 429, errorCode: "RATE_LIMITED", durationMs: Date.now() - startedAt });
    return noStore({ ok: false, error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  const supa = supabaseServer();

  const body = await req.json().catch(() => null);
  if (!body) {
    logger.warn({ requestId: reqId, route, status: 400, errorCode: "BAD_JSON", durationMs: Date.now() - startedAt });
    return noStore({ ok: false, error: "Bad JSON" }, { status: 400, headers: rateLimitHeaders(limit) });
  }

  if (body.secret !== process.env.SCAN_SECRET) {
    logger.warn({ requestId: reqId, route, status: 401, errorCode: "UNAUTHORIZED", durationMs: Date.now() - startedAt });
    return noStore({ ok: false, error: "Unauthorized" }, { status: 401, headers: rateLimitHeaders(limit) });
  }

  const symbol = String(body.symbol ?? "").trim();
  const signal = String(body.signal ?? "").toUpperCase().trim();
  const price = body.price == null ? null : Number(body.price);
  const score = body.score == null ? null : Number(body.score);
  const reasons = body.reasons == null ? null : String(body.reasons);
  const created_at = body.t ? parseTvTime(body.t) : new Date();

  if (!symbol || (signal !== "BUY" && signal !== "SELL")) {
    logger.warn({ requestId: reqId, route, symbol, signal, status: 400, errorCode: "MISSING_SYMBOL_SIGNAL", durationMs: Date.now() - startedAt });
    return noStore({ ok: false, error: "Missing symbol/signal" }, { status: 400, headers: rateLimitHeaders(limit) });
  }

  const { data, error } = await supa
    .from("signals")
    .insert([{ symbol, signal, price, score, reasons, created_at }])
    .select("*")
    .single();

  if (error) {
    logger.error({ requestId: reqId, route, symbol, signal, status: 500, errorCode: "SIGNAL_INSERT_FAILED", durationMs: Date.now() - startedAt, error });
    return noStore({ ok: false, error: error.message }, { status: 500, headers: rateLimitHeaders(limit) });
  }

  logger.info({ requestId: reqId, route, symbol, signal, status: 200, durationMs: Date.now() - startedAt });
  return noStore({ ok: true, data }, { headers: rateLimitHeaders(limit) });
}

export async function PATCH(req: Request) {
  const startedAt = Date.now();
  const reqId = requestId(req);
  const route = "/api/signals";
  const limit = await rateLimit({
    key: `signals:admin-mutation:${clientIp(req)}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    logger.warn({ requestId: reqId, route, status: 429, errorCode: "RATE_LIMITED", durationMs: Date.now() - startedAt });
    return noStore({ ok: false, error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  const supa = supabaseServer();

  const body = await req.json().catch(() => null);
  if (!body) {
    logger.warn({ requestId: reqId, route, status: 400, errorCode: "BAD_JSON", durationMs: Date.now() - startedAt });
    return noStore({ ok: false, error: "Bad JSON" }, { status: 400, headers: rateLimitHeaders(limit) });
  }

  const id = Number(body.id);
  const outcome: Outcome = body.outcome === "WIN" ? "WIN" : body.outcome === "LOSS" ? "LOSS" : null;
  if (!id) {
    logger.warn({ requestId: reqId, route, status: 400, errorCode: "MISSING_ID", durationMs: Date.now() - startedAt });
    return noStore({ ok: false, error: "Missing id" }, { status: 400, headers: rateLimitHeaders(limit) });
  }

  const { data, error } = await supa
    .from("signals")
    .update({ outcome })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logger.error({ requestId: reqId, route, status: 500, errorCode: "SIGNAL_UPDATE_FAILED", durationMs: Date.now() - startedAt, error });
    return noStore({ ok: false, error: error.message }, { status: 500, headers: rateLimitHeaders(limit) });
  }

  logger.info({ requestId: reqId, route, status: 200, durationMs: Date.now() - startedAt });
  return noStore({ ok: true, data }, { headers: rateLimitHeaders(limit) });
}
