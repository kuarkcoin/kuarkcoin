import { NextResponse } from "next/server";
import { getKapImportant } from "@/lib/server/kap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

type Mode = "raw" | "relaxed" | "strict";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") as Mode) || "relaxed";
  const result = await getKapImportant({ mode });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
