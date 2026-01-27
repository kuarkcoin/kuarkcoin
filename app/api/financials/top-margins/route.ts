import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const revalidate = 60; // KV okuması zaten hızlı; 1 dk yeter
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const universe = (searchParams.get("universe") || "BIST100").toUpperCase();
    const key = universe === "NASDAQ100" ? "top_margins:NASDAQ100" : "top_margins:BIST100";

    const data = await kv.get<any>(key);
    const lastRun = await kv.get<string>("top_margins:lastRun");

    // Cron hiç çalışmadıysa boş döndür
    if (!data) {
      return NextResponse.json({
        data: {
          universe,
          updatedAt: lastRun ?? null,
          periodHint: "UNKNOWN",
          topNet: [],
          topGross: [],
          topQuality: [],
          note: "KV empty. Run cron once.",
        },
      });
    }

    return NextResponse.json({
      data: {
        ...data,
        universe,
        updatedAt: data.updatedAt ?? lastRun ?? new Date().toISOString(),
      },
    });
  } catch (e: any) {
    console.error("public top-margins error:", e?.message || e);
    return NextResponse.json({
      data: { topNet: [], topGross: [], topQuality: [] },
    });
  }
}