import type { SupabaseClient } from "@supabase/supabase-js";
import { getMarketDataProvider } from "@/lib/market-data/provider";
import { getTimeframeExpirationMs } from "@/lib/signals/config";
import { evaluateSignalPerformance, type SignalDirection } from "@/lib/signals/performance-engine";

type SignalRow = {
  id: number | string;
  symbol: string | null;
  signal: string | null;
  price: number | string | null;
  target_price?: number | string | null;
  stop_price?: number | string | null;
  target?: number | string | null;
  stop?: number | string | null;
  timeframe?: string | null;
  created_at?: string | null;
  outcome?: string | null;
};

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function directionFromSignal(signal: string | null): SignalDirection | null {
  const normalized = signal?.toUpperCase();
  if (normalized === "BUY" || normalized === "LONG") return "LONG";
  if (normalized === "SELL" || normalized === "SHORT") return "SHORT";
  return null;
}

function noProviderResult(message: string) {
  return { ok: false as const, error: message, evaluated: 0, updated: 0, eventsWritten: 0 };
}

async function writeOutcomeEvent(
  supa: SupabaseClient,
  input: { signalId: SignalRow["id"]; eventType: string; metadata: Record<string, unknown>; price: number | null; happenedAt: string | null; returnPct: number | null },
) {
  const { data, error } = await supa
    .from("signal_outcome_events")
    .upsert(
      {
        signal_id: input.signalId,
        event_type: input.eventType,
        metadata: input.metadata,
        price: input.price,
        happened_at: input.happenedAt,
        return_pct: input.returnPct,
      },
      { onConflict: "signal_id,event_type", ignoreDuplicates: true },
    )
    .select("id");

  if (error) throw error;
  return Array.isArray(data) ? data.length : data ? 1 : 0;
}

export async function evaluateOpenSignals(supa: SupabaseClient, now = new Date()) {
  const provider = getMarketDataProvider();
  if (!provider.status.configured) return noProviderResult(provider.status.message);

  const { data: signals, error } = await supa
    .from("signals")
    .select("*")
    .is("outcome", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw error;

  let evaluated = 0;
  let updated = 0;
  let eventsWritten = 0;

  for (const signal of (signals ?? []) as SignalRow[]) {
    const direction = directionFromSignal(signal.signal);
    const entryPrice = asNumber(signal.price);
    const symbol = signal.symbol?.trim();
    if (!direction || !entryPrice || !symbol) continue;

    const timeframe = signal.timeframe ?? "1d";
    const createdAt = signal.created_at ? new Date(signal.created_at) : now;
    const expiresAt = new Date(createdAt.getTime() + getTimeframeExpirationMs(timeframe));
    const barsResult = await provider.getBars({ symbol, timeframe, from: createdAt, to: now });
    if (!barsResult.ok) continue;

    const result = evaluateSignalPerformance({
      direction,
      entryPrice,
      targetPrice: asNumber(signal.target_price ?? signal.target),
      stopPrice: asNumber(signal.stop_price ?? signal.stop),
      bars: barsResult.data,
      expiresAt,
      now,
    });

    evaluated += 1;
    if (result.outcome === "OPEN") continue;

    const outcome = result.outcome === "WIN" ? "WIN" : result.outcome === "LOSS" ? "LOSS" : "EXPIRED";
    const { error: updateError } = await supa
      .from("signals")
      .update({ outcome, outcome_return_pct: result.returnPct, outcome_at: result.exitTime ?? now.toISOString() })
      .eq("id", signal.id)
      .is("outcome", null);
    if (updateError) throw updateError;
    updated += 1;

    if (result.eventType) {
      eventsWritten += await writeOutcomeEvent(supa, {
        signalId: signal.id,
        eventType: result.eventType,
        metadata: result.metadata,
        price: result.exitPrice,
        happenedAt: result.exitTime,
        returnPct: result.returnPct,
      });
    }
  }

  return { ok: true as const, evaluated, updated, eventsWritten };
}
