import "server-only";
import { kv } from "@vercel/kv";

export type TopMarginRow = {
  symbol: string;
  finnhubSymbol?: string;
  grossMargin?: number | null;
  netMargin?: number | null;
  period?: "TTM" | "FY" | "UNKNOWN";
  grossSeries?: number[];
  netSeries?: number[];
  qualityScore?: number;
  volatility?: number;
};

export type TopMarginsResp = {
  universe: string;
  updatedAt?: string | null;
  periodHint?: string;
  topNet: TopMarginRow[];
  topGross: TopMarginRow[];
  topQuality: TopMarginRow[];
  note?: string;
};

function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export async function getTopMargins(universeInput: string): Promise<TopMarginsResp> {
  const universe = String(universeInput || "BIST100").toUpperCase();
  const key = universe === "NASDAQ100" || universe === "NASDAQ300" ? "top_margins:NASDAQ100" : "top_margins:BIST100";
  const [raw, lastRun] = await Promise.all([kv.get<any>(key), kv.get<string>("top_margins:lastRun")]);

  if (!raw) {
    return { universe, updatedAt: lastRun ?? null, periodHint: "UNKNOWN", topNet: [], topGross: [], topQuality: [], note: "KV empty. Run cron once." };
  }

  return {
    universe,
    updatedAt: raw.updatedAt ?? lastRun ?? new Date().toISOString(),
    periodHint: raw.periodHint ?? "UNKNOWN",
    topNet: safeArray<TopMarginRow>(raw.topNet),
    topGross: safeArray<TopMarginRow>(raw.topGross),
    topQuality: safeArray<TopMarginRow>(raw.topQuality),
    note: raw.note,
  };
}
