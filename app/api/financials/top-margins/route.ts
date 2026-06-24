import { NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TopMarginRow = { symbol: string; finnhubSymbol?: string; grossMargin?: number | null; netMargin?: number | null; period?: "TTM" | "FY" | "UNKNOWN"; grossSeries?: number[]; netSeries?: number[]; qualityScore?: number; volatility?: number };
type TopMarginsResp = { universe: string; updatedAt?: string | null; periodHint?: string; topNet: TopMarginRow[]; topGross: TopMarginRow[]; topQuality: TopMarginRow[]; note?: string };
function safeArray<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : []; }

export async function GET(req: Request) {
  try {
    const universe = ((new URL(req.url).searchParams.get("universe") || "BIST100").toUpperCase() === "NASDAQ100") ? "NASDAQ100" : "BIST100";
    const [raw, lastRun] = await Promise.all([kvGet<any>(`top_margins:${universe}`), kvGet<string>("top_margins:lastRun")]);
    if (!raw) return NextResponse.json({ data: { universe, updatedAt: lastRun ?? null, periodHint: "UNKNOWN", topNet: [], topGross: [], topQuality: [], note: "Cache empty. Run cron once." } satisfies TopMarginsResp });
    return NextResponse.json({ data: { universe, updatedAt: raw.updatedAt ?? lastRun ?? new Date().toISOString(), periodHint: raw.periodHint ?? "UNKNOWN", topNet: safeArray<TopMarginRow>(raw.topNet), topGross: safeArray<TopMarginRow>(raw.topGross), topQuality: safeArray<TopMarginRow>(raw.topQuality), note: raw.note } satisfies TopMarginsResp });
  } catch { return NextResponse.json({ data: { universe: "UNKNOWN", updatedAt: null, periodHint: "UNKNOWN", topNet: [], topGross: [], topQuality: [], note: "route error" } }, { status: 500 }); }
}
