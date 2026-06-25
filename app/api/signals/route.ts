import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { jsonNoStore, readJsonLimited } from "@/lib/http";
import { requireAdmin, requireWebhookSecret } from "@/lib/server-auth";
import { normalizeMarketSymbol } from "@/lib/symbols";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;
type SignalPayload = { secret?: string; symbol?: unknown; signal?: unknown; type?: unknown; price?: unknown; score?: unknown; reasons?: unknown; timeframe?: unknown; timestamp?: unknown; t?: unknown };

function safeSupabaseError(error: { code?: string; message?: string; details?: string } | null | undefined) {
  return { code: error?.code, message: error?.message, details: error?.details };
}

function safeUnknownError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error).slice(0, 200) };
}

function istanbulDayRange(date = new Date()) {
  const tzOffsetMs = 3 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + tzOffsetMs);
  const startLocal = new Date(local); startLocal.setHours(0, 0, 0, 0);
  const endLocal = new Date(startLocal); endLocal.setDate(endLocal.getDate() + 1);
  return { startUTC: new Date(startLocal.getTime() - tzOffsetMs), endUTC: new Date(endLocal.getTime() - tzOffsetMs) };
}

function parseTvTime(t: unknown) { const n = Number(t); if (!Number.isFinite(n) || n <= 0) return new Date(); return new Date(n < 1e12 ? n * 1000 : n); }
function cleanText(v: unknown, max = 1000) { return v == null ? null : String(v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max); }
function validateSignalPayload(body: SignalPayload) {
  const norm = normalizeMarketSymbol(String(body.symbol ?? ""));
  const signal = String(body.signal ?? body.type ?? "").toUpperCase().trim();
  const price = body.price == null ? null : Number(body.price);
  const score = body.score == null ? null : Number(body.score);
  const timeframe = cleanText(body.timeframe, 20);
  const timeRaw = body.timestamp ?? body.t;
  const created_at = timeRaw ? parseTvTime(timeRaw) : new Date();
  if (!norm) return { ok: false as const, error: "Invalid symbol" };
  if (signal !== "BUY" && signal !== "SELL") return { ok: false as const, error: "Invalid signal" };
  if (price != null && (!Number.isFinite(price) || price < 0)) return { ok: false as const, error: "Invalid price" };
  if (score != null && !Number.isFinite(score)) return { ok: false as const, error: "Invalid score" };
  if (Number.isNaN(created_at.getTime())) return { ok: false as const, error: "Invalid timestamp" };
  return { ok: true as const, data: { symbol: norm.providerSymbol, signal, price, score, reasons: cleanText(body.reasons, 1000), timeframe, created_at } };
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
    if (dupError) {
      console.error("Signal duplicate check failed", safeSupabaseError(dupError));
      return jsonNoStore({ ok: false, error: "Signal could not be saved" }, { status: 500 });
    }
    if (existing?.length) return jsonNoStore({ ok: true, duplicate: true });
    const { data, error } = await supa.from("signals").insert([valid.data]).select("id,symbol,signal,created_at").single();
    if (error) {
      console.error("Signal insert failed", safeSupabaseError(error));
      return jsonNoStore({ ok: false, error: "Signal could not be saved" }, { status: 500 });
    }
    return jsonNoStore({ ok: true, data });
  } catch (error) {
    console.error("Signal POST failed", safeUnknownError(error));
    return jsonNoStore({ ok: false, error: "Signal could not be saved" }, { status: 500 });
  }
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
