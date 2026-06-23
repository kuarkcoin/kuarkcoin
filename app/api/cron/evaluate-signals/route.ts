import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { evaluateOpenSignals } from "@/lib/signals/outcome-evaluator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(json: unknown, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return noStore({ ok: false, error: "CRON_SECRET not configured" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const provided = getBearerToken(req) ?? searchParams.get("secret");
  if (provided !== secret) return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });

  const result = await evaluateOpenSignals(supabaseServer());
  if (!result.ok) return noStore(result, { status: 503 });
  return noStore(result);
}

export const POST = GET;
