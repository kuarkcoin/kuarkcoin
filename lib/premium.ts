export function isPremiumEnabled() {
  return process.env.ENABLE_PREMIUM === "true";
}

export function isDemoPremiumUser() {
  return process.env.DEMO_PREMIUM_USER === "true";
}

export function getPremiumStatus() {
  return {
    premiumEnabled: isPremiumEnabled(),
    isPremium: isDemoPremiumUser(),
  };
}
