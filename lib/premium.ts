import { cookies, headers } from "next/headers";

export type PremiumStatus = {
  isPremium: boolean;
  plan: "free" | "premium";
};

const PREMIUM_VALUES = new Set(["1", "true", "yes", "premium", "pro", "paid"]);

function isPremiumValue(value: string | undefined) {
  return Boolean(value && PREMIUM_VALUES.has(value.trim().toLowerCase()));
}

export async function getPremiumStatus(): Promise<PremiumStatus> {
  const cookieStore = cookies();
  const headerStore = headers();
  const premiumValue =
    cookieStore.get("premium")?.value ??
    cookieStore.get("isPremium")?.value ??
    cookieStore.get("plan")?.value ??
    headerStore.get("x-premium-status") ??
    headerStore.get("x-user-plan") ??
    process.env.KUARK_PREMIUM_PREVIEW;
  const isPremium = isPremiumValue(premiumValue);

  return {
    isPremium,
    plan: isPremium ? "premium" : "free",
  };
}
