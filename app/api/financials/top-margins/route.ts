import { NextResponse } from "next/server";
import { getTopMargins } from "@/lib/server/topMargins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const universe = (searchParams.get("universe") || "BIST100").toUpperCase();
    const data = await getTopMargins(universe);
    return NextResponse.json({ data }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (e: any) {
    console.error("public top-margins error:", e?.message || e);
    return NextResponse.json({ data: { universe: "UNKNOWN", updatedAt: null, periodHint: "UNKNOWN", topNet: [], topGross: [], topQuality: [], note: "route error" } }, { status: 500 });
  }
}
