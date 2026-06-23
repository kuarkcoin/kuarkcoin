import { NextResponse } from "next/server";
import { getBillingProvider } from "@/lib/billing/get-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "").trim();
  if (!userId) return NextResponse.json({ ok: false, message: "Kullanıcı bulunamadı" }, { status: 400 });

  try {
    const baseUrl = siteUrl(req);
    const result = await getBillingProvider().createCheckoutSession({
      userId,
      email: body?.email ? String(body.email) : undefined,
      interval: body?.interval === "yearly" ? "yearly" : "monthly",
      successUrl: body?.successUrl ? String(body.successUrl) : `${baseUrl}/billing/success`,
      cancelUrl: body?.cancelUrl ? String(body.cancelUrl) : `${baseUrl}/billing/cancel`,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Checkout oluşturulamadı" }, { status: 500 });
  }
}
