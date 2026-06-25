import { supabaseServer } from "./supabaseServer.ts";

export type SignalRow = {
  id?: number | string | null;
  created_at?: string | null;
  symbol?: string | null;
  name?: string | null;
  signal?: string | null;
  price?: number | string | null;
  score?: number | string | null;
  rvol?: number | string | null;
  timeframe?: string | null;
  type?: string | null;
  category?: string | null;
  exchange?: string | null;
  source?: string | null;
  reasons?: string | null;
};

export function normalizeSignalsLimit(value: string | null | undefined, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

export async function listSignals(limit = 50) {
  const { data, error } = await supabaseServer()
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  return { data: (data ?? []) as SignalRow[], error };
}
