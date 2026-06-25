import { NextResponse } from "next/server.js";
import { supabaseServer } from "../../../lib/supabaseServer.ts";
import { jsonNoStore, readJsonLimited } from "../../../lib/http.ts";
import { requireAdmin, requireWebhookSecret } from "../../../lib/server-auth.ts";
import { normalizeMarketSymbol } from "../../../lib/symbols.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;
export type SignalPayload = { secret?: string; symbol?: unknown; ticker?: unknown; signal?: unknown; action?: unknown; type?: unknown; price?: unknown; close?: unknown; score?: unknown; reasons?: unknown; timeframe?: unknown; timestamp?: unknown; t?: unknown };
export type SupabaseSignalsClient = ReturnType<typeof supabaseServer>;

type NormalizedSignal = {
  symbol: string;
  signal: "BUY" | "SELL";
  price: number | null;
  score: number | null;
  reasons: string | null;
  timeframe: string | null;
  created_at: Date;
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

export function normalizeSignalAction(value: unknown) {
  const action = String(value ?? "").toUpperCase().trim();
  if (action === "BUY" || action === "AL" || action === "LONG") return "BUY" as const;
  if (action === "SELL" || action === "SAT" || action === "SHORT") return "SELL" as const;
  return null;
}

export function normalizeSignalPayload(body: SignalPayload): SignalPayload {
  return {
    ...body,
    symbol: body.symbol ?? body.ticker,
    signal: body.signal ?? body.action ?? body.type,
    price: body.price ?? body.close,
  };
}

export function validateSignalPayload(input: SignalPayload): { ok: true; data: NormalizedSignal } | { ok: false; error: string } {
  const body = normalizeSignalPayload(input);
  const norm = normalizeMarketSymbol(String(body.symbol ?? ""));
  const signal = normalizeSignalAction(body.signal);
  const price = body.price == null || body.price === "" ? null : Number(body.price);
  const score = body.score == null || body.score === "" ? null : Number(body.score);
  const timeframe = cleanText(body.timeframe, 20);
  const timeRaw = body.timestamp ?? body.t;
  const created_at = timeRaw ? parseTvTime(timeRaw) : new Date();
  if (!norm) return { ok: false as const, error: "Invalid symbol" };
  if (!signal) return { ok: false as const, error: "Invalid signal" };
  if (price != null && (!Number.isFinite(price) || price < 0)) return { ok: false as const, error: "Invalid price" };
  if (score != null && !Number.isFinite(score)) return { ok: false as const, error: "Invalid score" };
  if (Number.isNaN(created_at.getTime())) return { ok: false as const, error: "Invalid timestamp" };
  return { ok: true as const, data: { symbol: norm.providerSymbol, signal, price, score, reasons: cleanText(body.reasons, 1000), timeframe, created_at } };
}

function formToPayload(params: URLSearchParams) {
  return Object.fromEntries(params.entries()) as SignalPayload;
}

export async function readSignalPayload(req: Request, maxBytes = 16 * 1024): Promise<{ ok: true; data: SignalPayload } | { ok: false; status: number; error: string }> {
  const contentType = req.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "application/json";
  if (contentType === "application/x-www-form-urlencoded") {
    const text = await req.text();
    if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413, error: "Payload too large" };
    return { ok: true, data: formToPayload(new URLSearchParams(text)) };
  }
  if (contentType === "text/plain") {
    const text = await req.text();
    if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413, error: "Payload too large" };
    return { ok: true, data: formToPayload(new URLSearchParams(text.replace(/\r?\n/g, "&"))) };
  }
  return readJsonLimited<SignalPayload>(req, maxBytes);
}

export async function insertSignal(supa: SupabaseSignalsClient, valid: NormalizedSignal) {
  const since = new Date(valid.created_at.getTime() - 2 * 60 * 1000).toISOString();
  const { data: existing, error: dupError } = await supa.from("signals").select("id").eq("symbol", valid.symbol).eq("signal", valid.signal).gte("created_at", since).limit(1);
  if (dupError) return { ok: false as const };
  if (existing?.length) return { ok: true as const, duplicate: true as const };
  const { data, error } = await supa.from("signals").insert([valid]).select("*").single();
  if (error) return { ok: false as const };
  return { ok: true as const, data };
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

export async function postSignals(req: Request, createSupabase: () => SupabaseSignalsClient = supabaseServer) {
  const parsed = await readSignalPayload(req, 16 * 1024);
  if (!parsed.ok) return jsonNoStore({ ok: false, error: parsed.error }, { status: parsed.status });
  const authError = requireWebhookSecret(req, parsed.data as Record<string, unknown>);
  if (authError) return authError;
  const valid = validateSignalPayload(parsed.data);
  if (!valid.ok) return jsonNoStore({ ok: false, error: valid.error }, { status: 400 });
  try {
    const saved = await insertSignal(createSupabase(), valid.data);
    if (!saved.ok) return jsonNoStore({ ok: false, error: "Signal could not be saved" }, { status: 500 });
    if (saved.duplicate) return jsonNoStore({ ok: true, duplicate: true });
    return jsonNoStore({ ok: true, data: saved.data });
  } catch { return jsonNoStore({ ok: false, error: "Signal could not be saved" }, { status: 500 }); }
}

export async function POST(req: Request) {
  return postSignals(req);
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
