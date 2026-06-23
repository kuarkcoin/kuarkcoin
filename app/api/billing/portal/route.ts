import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getBillingProvider } from "@/lib/billing/get-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
}

async function findCustomerId(userId: string) {
  try {
    const { data } = await supabaseServer()
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.provider_customer_id ? String(data.provider_customer_id) : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "").trim();
  if (!userId) return NextResponse.json({ ok: false, message: "Kullanıcı bulunamadı" }, { status: 400 });

  try {
    const customerId = body?.customerId ? String(body.customerId) : await findCustomerId(userId);
    const result = await getBillingProvider().createPortalSession({
      userId,
      customerId,
      returnUrl: body?.returnUrl ? String(body.returnUrl) : `${siteUrl(req)}/account`,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Portal oluşturulamadı" }, { status: 500 });
  }
}
