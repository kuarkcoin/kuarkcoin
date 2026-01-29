import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // KV -> her request güncel

type TopMarginRow = {
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

type TopMarginsResp = {
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const universe = (searchParams.get("universe") || "BIST100").toUpperCase();
    const key = universe === "NASDAQ100" ? "top_margins:NASDAQ100" : "top_margins:BIST100";

    const [raw, lastRun] = await Promise.all([
      kv.get<any>(key),
      kv.get<string>("top_margins:lastRun"),
    ]);

    if (!raw) {
      const empty: TopMarginsResp = {
        universe,
        updatedAt: lastRun ?? null,
        periodHint: "UNKNOWN",
        topNet: [],
        topGross: [],
        topQuality: [],
        note: "KV empty. Run cron once.",
      };
      return NextResponse.json({ data: empty });
    }

    const data: TopMarginsResp = {
      universe,
      updatedAt: raw.updatedAt ?? lastRun ?? new Date().toISOString(),
      periodHint: raw.periodHint ?? "UNKNOWN",
      topNet: safeArray<TopMarginRow>(raw.topNet),
      topGross: safeArray<TopMarginRow>(raw.topGross),
      topQuality: safeArray<TopMarginRow>(raw.topQuality),
      note: raw.note,
    };

    return NextResponse.json({ data });
  } catch (e: any) {
    console.error("public top-margins error:", e?.message || e);
    return NextResponse.json(
      {
        data: {
          universe: "UNKNOWN",
          updatedAt: null,
          periodHint: "UNKNOWN",
          topNet: [],
          topGross: [],
          topQuality: [],
          note: "route error",
        },
      },
      { status: 500 }
    );
  }
}