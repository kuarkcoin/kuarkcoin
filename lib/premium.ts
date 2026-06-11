type PremiumStatus = {
  premiumEnabled: boolean;
  isPremium: boolean;
};

function readBooleanEnv(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

export function getPremiumStatus(): PremiumStatus {
  const premiumEnabled = readBooleanEnv(process.env.PREMIUM_ENABLED ?? process.env.NEXT_PUBLIC_PREMIUM_ENABLED);
  const isPremium = readBooleanEnv(process.env.IS_PREMIUM ?? process.env.PREMIUM_USER_ENABLED);

  return {
    premiumEnabled,
    isPremium,
  };
}
