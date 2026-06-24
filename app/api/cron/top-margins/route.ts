import { NextResponse } from "next/server";
import { computeTopMargins } from "@/lib/topMarginsCompute";
import { kvSet } from "@/lib/kv";
import { requireCron } from "@/lib/server-auth";
import { BIST100, NASDAQ100 } from "@/constants/universe";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const auth = requireCron(req);
  if (auth) return auth;
  const finnhubToken = process.env.FINNHUB_API_KEY;
  if (!finnhubToken) return NextResponse.json({ ok: false, error: "Market data is not configured" }, { status: 503 });

  const failures: string[] = [];
  let successCount = 0;
  try {
    for (const [universe, symbols] of [["BIST100", BIST100], ["NASDAQ100", NASDAQ100]] as const) {
      try {
        const result = await computeTopMargins({ universe, symbols: symbols.slice(0, 100), limit: 10, finnhubToken });
        await kvSet(`top_margins:${universe}`, result, 60 * 60 * 24);
        successCount++;
      } catch { failures.push(universe); }
    }
    if (successCount === 0) return NextResponse.json({ ok: false, successCount, failureCount: failures.length, failedUniverses: failures, error: "Cron failed" }, { status: 502 });
    await kvSet("top_margins:lastRun", new Date().toISOString(), 60 * 60 * 24 * 7);
    return NextResponse.json({ ok: failures.length === 0, successCount, failureCount: failures.length, failedUniverses: failures, at: new Date().toISOString() }, { status: failures.length ? 207 : 200 });
  } catch { return NextResponse.json({ ok: false, error: "Cron failed" }, { status: 500 }); }
}
