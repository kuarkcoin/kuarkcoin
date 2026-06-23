import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { calculateSignalStats, type SignalStatsRow } from "@/lib/analytics/signal-stats";

export const periods = ["7", "30", "90", "all"] as const;
export type AnalyticsPeriod = (typeof periods)[number];

export function noStore(json: unknown, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

function isPrivileged(req: Request, searchParams: URLSearchParams) {
  const plan = (req.headers.get("x-user-plan") ?? req.headers.get("x-plan") ?? searchParams.get("plan") ?? "free").toLowerCase();
  const role = (req.headers.get("x-user-role") ?? req.headers.get("x-role") ?? searchParams.get("role") ?? "").toLowerCase();
  return plan === "premium" || role === "admin";
}

export function resolveAnalyticsAccess(req: Request) {
  const { searchParams } = new URL(req.url);
  const privileged = isPrivileged(req, searchParams);
  const requested = searchParams.get("period") as AnalyticsPeriod | null;
  const allowedPeriods: AnalyticsPeriod[] = privileged ? ["7", "30", "90", "all"] : ["7"];
  const period: AnalyticsPeriod = requested && allowedPeriods.includes(requested) ? requested : "7";
  return { period, allowedPeriods, requestedPeriod: requested, privileged };
}

export async function fetchSignalRows(period: AnalyticsPeriod) {
  const supa = supabaseServer();
  let query = supa.from("signals").select("*").order("created_at", { ascending: true });
  if (period !== "all") {
    const since = new Date();
    since.setDate(since.getDate() - Number(period));
    query = query.gte("created_at", since.toISOString());
  }
  const { data, error } = await query.limit(10000);
  if (error) throw error;
  return (data ?? []) as SignalStatsRow[];
}

export async function analyticsPayload(req: Request) {
  const access = resolveAnalyticsAccess(req);
  const rows = await fetchSignalRows(access.period);
  return { ok: true, period: access.period, allowedPeriods: access.allowedPeriods, stats: calculateSignalStats(rows) };
}
