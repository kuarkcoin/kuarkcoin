import { NextResponse } from "next/server";
import { getBillingProvider } from "@/lib/billing/get-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const payload = await req.text();
  try {
    const result = await getBillingProvider().handleWebhook(payload, req.headers);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Webhook işlenemedi" }, { status: 500 });
  }
}
