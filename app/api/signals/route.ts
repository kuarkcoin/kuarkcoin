import { NextResponse } from "next/server";
import { jsonNoStore, readJsonLimited } from "../../../lib/http.ts";
import { requireAdmin, requireWebhookSecret } from "../../../lib/server-auth.ts";
import { normalizeSignalPayload, type SignalPayload } from "../../../lib/signals.ts";
import { listSignals, normalizeSignalsLimit } from "../../../lib/signalsRepository.ts";
import { getSignalsSupabaseClient } from "./supabaseFactory.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;

function istanbulDayRange(date = new Date()) {
  const tzOffsetMs = 3 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + tzOffsetMs);
  const startLocal = new Date(local); startLocal.setHours(0, 0, 0, 0);
  const endLocal = new Date(startLocal); endLocal.setDate(endLocal.getDate() + 1);
  return { startUTC: new Date(startLocal.getTime() - tzOffsetMs), endUTC: new Date(endLocal.getTime() - tzOffsetMs) };
}

function decodeFormValue(value: string) {
  try { return decodeURIComponent(value.replace(/\+/g, " ")); }
  catch { return value; }
}

function parseKeyValueText(text: string) {
  const separator = text.includes("&") && !text.includes("\n") ? "&" : /\r?\n/;
  const entries: [string, string][] = [];
  for (const rawLine of text.split(separator)) {
    const line = rawLine.trim();
    if (!line) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = decodeFormValue(line.slice(0, eq).trim());
    if (!key) continue;
    entries.push([key, decodeFormValue(line.slice(eq + 1).trim())]);
  }
  return Object.fromEntries(entries) as SignalPayload;
}

async function readWebhookBody(req: Request) {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json") || !contentType) return readJsonLimited<SignalPayload>(req, 16 * 1024);
  const len = req.headers.get("content-length");
  if (len && Number(len) > 16 * 1024) return { ok: false as const, status: 413, error: "Payload too large" };
  const text = await req.text();
  if (new TextEncoder().encode(text).length > 16 * 1024) return { ok: false as const, status: 413, error: "Payload too large" };
  if (contentType.includes("application/x-www-form-urlencoded")) return { ok: true as const, data: Object.fromEntries(new URLSearchParams(text)) };
  if (contentType.includes("text/plain")) {
    try { return { ok: true as const, data: JSON.parse(text || "{}") as SignalPayload }; }
    catch { return { ok: true as const, data: parseKeyValueText(text) }; }
  }
  return { ok: false as const, status: 415, error: "Unsupported content type" };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  try {
    if (scope === "health") {
      return jsonNoStore({ ok: true, webhookConfigured: Boolean(process.env.SCAN_SECRET), supabaseConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) });
    }
    if (scope === "todayTop") {
      const supa = getSignalsSupabaseClient();
      const { startUTC, endUTC } = istanbulDayRange();
      const base = () => supa.from("signals").select("*").gte("created_at", startUTC.toISOString()).lt("created_at", endUTC.toISOString()).not("score", "is", null);
      const [{ data: topBuy, error: e1 }, { data: topSell, error: e2 }] = await Promise.all([
        base().eq("signal", "BUY").order("score", { ascending: false }).order("created_at", { ascending: false }).limit(5),
        base().eq("signal", "SELL").order("score", { ascending: false }).order("created_at", { ascending: false }).limit(5),
      ]);
      if (e1 || e2) return jsonNoStore({ ok: false, topBuy: [], topSell: [], error: "Signals unavailable" }, { status: 500 });
      return jsonNoStore({ ok: true, topBuy: topBuy ?? [], topSell: topSell ?? [] });
    }
    const { data, error } = await listSignals(normalizeSignalsLimit(searchParams.get("limit")));
    if (error) return jsonNoStore({ ok: false, data: [], error: "Signals unavailable" }, { status: 500 });
    return jsonNoStore({ ok: true, data });
  } catch { return jsonNoStore({ ok: false, data: [], error: "Signals unavailable" }, { status: 500 }); }
}

export async function POST(req: Request) {
  const parsed = await readWebhookBody(req);
  if (!parsed.ok) return jsonNoStore({ ok: false, error: parsed.error }, { status: parsed.status });
  const authError = requireWebhookSecret(req, parsed.data as Record<string, unknown>);
  if (authError) return authError;
  const valid = normalizeSignalPayload(parsed.data);
  if (!valid.ok) return jsonNoStore({ ok: false, error: valid.error }, { status: 400 });
  try {
    const supa = getSignalsSupabaseClient();
    const since = new Date(valid.data.created_at.getTime() - 2 * 60 * 1000).toISOString();
    const duplicateQuery = supa.from("signals").select("id").eq("symbol", valid.data.symbol).eq("signal", valid.data.signal);
    const duplicateWithTimeframe = valid.data.timeframe === null ? duplicateQuery.is("timeframe", null) : duplicateQuery.eq("timeframe", valid.data.timeframe);
    const { data: existing, error: dupError } = await duplicateWithTimeframe.gte("created_at", since).limit(1);
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
    const { data, error } = await getSignalsSupabaseClient().from("signals").update({ outcome }).eq("id", id).select("*").maybeSingle();
    if (error) return jsonNoStore({ ok: false, error: "Signal could not be updated" }, { status: 500 });
    if (!data) return jsonNoStore({ ok: false, error: "Signal not found" }, { status: 404 });
    return jsonNoStore({ ok: true, data });
  } catch { return jsonNoStore({ ok: false, error: "Signal could not be updated" }, { status: 500 }); }
}
