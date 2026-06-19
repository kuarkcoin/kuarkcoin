import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

export type SignalRow = {
  id: number;
  created_at: string;
  symbol: string;
  signal: string;
  price: number | null;
  score: number | null;
  reasons: string | null;
};

export type Outcome = "WIN" | "LOSS" | null;

export function istanbulDayRange(date = new Date()) {
  const tzOffsetMs = 3 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + tzOffsetMs);
  const startLocal = new Date(local);
  startLocal.setHours(0, 0, 0, 0);
  const endLocal = new Date(startLocal);
  endLocal.setDate(endLocal.getDate() + 1);
  return {
    startUTC: new Date(startLocal.getTime() - tzOffsetMs),
    endUTC: new Date(endLocal.getTime() - tzOffsetMs),
  };
}

async function queryLatestSignals(limit: number): Promise<SignalRow[]> {
  const { data, error } = await supabaseServer()
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SignalRow[];
}

export const getLatestSignals = unstable_cache(
  async (limit = 6) => queryLatestSignals(limit),
  ["latest-signals"],
  { revalidate: 15, tags: ["signals"] }
);

export async function getSignals(limit = 500) {
  return queryLatestSignals(limit);
}

export async function getTodayTopSignals(limit = 5) {
  const supa = supabaseServer();
  const { startUTC, endUTC } = istanbulDayRange();
  const base = () =>
    supa
      .from("signals")
      .select("*")
      .gte("created_at", startUTC.toISOString())
      .lt("created_at", endUTC.toISOString())
      .not("score", "is", null);

  const [buy, sell] = await Promise.all([
    base().eq("signal", "BUY").order("score", { ascending: false }).order("created_at", { ascending: false }).limit(limit),
    base().eq("signal", "SELL").order("score", { ascending: false }).order("created_at", { ascending: false }).limit(limit),
  ]);

  if (buy.error || sell.error) throw buy.error ?? sell.error;
  return { topBuy: (buy.data ?? []) as SignalRow[], topSell: (sell.data ?? []) as SignalRow[] };
}

export function parseTvTime(t: any) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n < 1e12 ? n * 1000 : n);
}
