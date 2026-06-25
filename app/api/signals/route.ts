import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { jsonNoStore, readJsonLimited } from "@/lib/http";
import { requireAdmin, requireWebhookSecret } from "@/lib/server-auth";
import { normalizeMarketSymbol } from "@/lib/symbols";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;
type SignalPayload = Record<string, unknown> & { secret?: string; reasons?: unknown; timestamp?: unknown; t?: unknown };
type PayloadKey = keyof SignalPayload | string;
type NormalizedSignalPayload = {
  symbol: unknown;
  signal: unknown;
  price: unknown;
  score: unknown;
  timeframe: unknown;
  reasons: unknown;
  timestamp: unknown;
  t: unknown;
};

function istanbulDayRange(date = new Date()) {
  const tzOffsetMs = 3 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + tzOffsetMs);
  const startLocal = new Date(local); startLocal.setHours(0, 0, 0, 0);
  const endLocal = new Date(startLocal); endLocal.setDate(endLocal.getDate() + 1);
  return { startUTC: new Date(startLocal.getTime() - tzOffsetMs), endUTC: new Date(endLocal.getTime() - tzOffsetMs) };
}

function parseTvTime(t: unknown) { const n = Number(t); if (!Number.isFinite(n) || n <= 0) return new Date(); return new Date(n < 1e12 ? n * 1000 : n); }
function cleanText(v: unknown, max = 1000) { return v == null ? null : String(v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max); }
function pickFirst<T extends Record<string, unknown>>(payload: T, keys: readonly (keyof T | string)[]): unknown {
  for (const key of keys) {
    const value = payload[key as keyof T];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizeSignalPayload(body: SignalPayload): NormalizedSignalPayload {
  return {
    symbol: pickFirst(body, ["symbol", "ticker", "tickerid", "instrument", "market"] satisfies readonly PayloadKey[]),
    signal: pickFirst(body, ["signal", "action", "side", "direction", "order_action", "type"] satisfies readonly PayloadKey[]),
    price: pickFirst(body, ["price", "close", "entry_price", "fill_price", "entryPrice"] satisfies readonly PayloadKey[]),
    score: pickFirst(body, ["score", "strength", "puan", "rating", "confidence"] satisfies readonly PayloadKey[]),
    timeframe: pickFirst(body, ["timeframe", "interval", "tf", "period"] satisfies readonly PayloadKey[]),
    reasons: body.reasons,
    timestamp: body.timestamp,
    t: body.t,
  };
}

function validateSignalPayload(body: SignalPayload) {
  const normalized = normalizeSignalPayload(body);
  const norm = normalizeMarketSymbol(String(normalized.symbol ?? ""));
  const signal = String(normalized.signal ?? "").toUpperCase().trim();
  const price = normalized.price == null ? null : Number(normalized.price);
  const score = normalized.score == null ? null : Number(normalized.score);
  const timeframe = cleanText(normalized.timeframe, 20);
  const timeRaw = normalized.timestamp ?? normalized.t;
  const created_at = timeRaw ? parseTvTime(timeRaw) : new Date();
  if (!norm) return { ok: false as const, error: "Invalid symbol" };
  if (signal !== "BUY" && signal !== "SELL") return { ok: false as const, error: "Invalid signal" };
  if (price != null && (!Number.isFinite(price) || price < 0)) return { ok: false as const, error: "Invalid price" };
  if (score != null && !Number.isFinite(score)) return { ok: false as const, error: "Invalid score" };
  if (Number.isNaN(created_at.getTime())) return { ok: false as const, error: "Invalid timestamp" };
  return { ok: true as const, data: { symbol: norm.providerSymbol, signal, price, score, reasons: cleanText(normalized.reasons, 1000), timeframe, created_at } };
}

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  try {
    if (scope === "todayTop") {
      const { startUTC, endUTC } = istanbulDayRange();
      const base = () => supa.from("signals").select("*").gte("created_at", startUTC.toISOString()).lt("created_at", endUTC.toISOString()).not("score", "is", null);
      const [{ data: topBuy, error: e1 }, { data: topSell, error: e2 }] = await Promise.all([
        base().eq("signal", "BUY").order("score", { ascending: false }).order("created_at", { ascending: false }).limit(5),
        base().eq("signal", "SELL").order("score", { ascending: false }).order("created_at", { ascending: false }).limit(5),
      ]);
      if (e1 || e2) return jsonNoStore({ ok: false, topBuy: [], topSell: [], error: "Signals unavailable" }, { status: 500 });
      return jsonNoStore({ ok: true, topBuy: topBuy ?? [], topSell: topSell ?? [] });
    }
    const { data, error } = await supa.from("signals").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return jsonNoStore({ ok: false, data: [], error: "Signals unavailable" }, { status: 500 });
    return jsonNoStore({ ok: true, data: data ?? [] });
  } catch { return jsonNoStore({ ok: false, data: [], error: "Signals unavailable" }, { status: 500 }); }
}

export async function POST(req: Request) {
  const parsed = await readJsonLimited<SignalPayload>(req, 16 * 1024);
  if (!parsed.ok) return jsonNoStore({ ok: false, error: parsed.error }, { status: parsed.status });
  const authError = requireWebhookSecret(req, parsed.data as Record<string, unknown>);
  if (authError) return authError;
  const valid = validateSignalPayload(parsed.data);
  if (!valid.ok) return jsonNoStore({ ok: false, error: valid.error }, { status: 400 });
  try {
    const supa = supabaseServer();
    const since = new Date(valid.data.created_at.getTime() - 2 * 60 * 1000).toISOString();
    const { data: existing, error: dupError } = await supa.from("signals").select("id").eq("symbol", valid.data.symbol).eq("signal", valid.data.signal).gte("created_at", since).limit(1);
    if (dupError) return jsonNoStore({ ok: false, error: "Signal could not be saved" }, { status: 500 });
    if (existing?.length) return jsonNoStore({ ok: true, duplicate: true });
    const { data, error } = await supa.from("signals").insert([valid.data]).select("*").single();
    if (error) return jsonNoStore({ ok: false, error: "Signal could not be saved" }, { status: 500 });
    return jsonNoStore({ ok: true, data });
  } catch { return jsonNoStore({ ok: false, error: "Signal could not be saved" }, { status: 500 }); }
}

export async function PATCH(req: Request) {
  const authError = requireAdmin(req);
  if (authError) return authError;
  const parsed = await readJsonLimited<{ id?: unknown; outcome?: unknown; result?: unknown }>(req, 4096);
  if (!parsed.ok) return jsonNoStore({ ok: false, error: parsed.error }, { status: parsed.status });
  const id = Number(parsed.data.id);
  const raw = parsed.data.outcome ?? parsed.data.result;
  if (!Number.isInteger(id) || id <= 0) return jsonNoStore({ ok: false, error: "Invalid id" }, { status: 400 });
  const outcome: Outcome = raw === null || raw === undefined || raw === "" ? null : raw === "WIN" ? "WIN" : raw === "LOSS" ? "LOSS" : ("INVALID" as Outcome);
  if (outcome === ("INVALID" as Outcome)) return jsonNoStore({ ok: false, error: "Invalid result" }, { status: 400 });
  try {
    const { data, error } = await supabaseServer().from("signals").update({ outcome }).eq("id", id).select("*").maybeSingle();
    if (error) return jsonNoStore({ ok: false, error: "Signal could not be updated" }, { status: 500 });
    if (!data) return jsonNoStore({ ok: false, error: "Signal not found" }, { status: 404 });
    return jsonNoStore({ ok: true, data });
  } catch { return jsonNoStore({ ok: false, error: "Signal could not be updated" }, { status: 500 }); }
}
