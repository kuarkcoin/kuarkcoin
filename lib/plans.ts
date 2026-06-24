export type UserRole = "free" | "premium" | "admin";

export type FeatureLimits = {
  dailyAiAnalyses: number;
  canUsePremiumSignals: boolean;
  canManageSignals: boolean;
};

export const PLAN_LIMITS: Record<UserRole, FeatureLimits> = {
  free: { dailyAiAnalyses: 10, canUsePremiumSignals: false, canManageSignals: false },
  premium: { dailyAiAnalyses: 100, canUsePremiumSignals: true, canManageSignals: false },
  admin: { dailyAiAnalyses: 1000, canUsePremiumSignals: true, canManageSignals: true },
};
