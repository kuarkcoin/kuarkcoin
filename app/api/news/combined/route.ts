import { NextResponse } from "next/server";
import { getNewsCombined, parseNewsSearchParams } from "@/lib/server/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 120;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const result = await getNewsCombined(parseNewsSearchParams(searchParams));
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
  });
}
