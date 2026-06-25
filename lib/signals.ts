import "server-only";

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

function logSignalsError(error: unknown) {
  const safeDetails =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: String(error) };

  console.error("getLatestSignals failed", safeDetails);
}

export async function getLatestSignals(limit: number): Promise<SignalRow[]> {
  try {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 6;
    const { data, error } = await supabaseServer()
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      logSignalsError(error);
      return [];
    }

    return Array.isArray(data) ? (data as SignalRow[]) : [];
  } catch (error) {
    logSignalsError(error);
    return [];
  }
}
