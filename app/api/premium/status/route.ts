import { NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/premium";

export async function GET() {
  const { premiumEnabled, isPremium } = await getPremiumStatus();

  return NextResponse.json({
    ok: true,
    premiumEnabled,
    isPremium,
  });
}
