export type SubscriptionPlan = "free" | "premium" | "admin";

export type SignalEntitlement = {
  plan: SubscriptionPlan;
  realtime: boolean;
  historyLimit: number;
  delayMinutes: number;
  includePremiumFields: boolean;
};

export const FREE_SIGNAL_ENTITLEMENT: SignalEntitlement = {
  plan: "free",
  realtime: false,
  historyLimit: 20,
  delayMinutes: 15,
  includePremiumFields: false,
};

export const PREMIUM_SIGNAL_ENTITLEMENT: SignalEntitlement = {
  plan: "premium",
  realtime: true,
  historyLimit: 500,
  delayMinutes: 0,
  includePremiumFields: true,
};

export const ADMIN_SIGNAL_ENTITLEMENT: SignalEntitlement = {
  ...PREMIUM_SIGNAL_ENTITLEMENT,
  plan: "admin",
};

export const BASIC_SIGNAL_FIELDS = [
  "id",
  "created_at",
  "symbol",
  "signal",
  "price",
  "score",
  "outcome",
  "name",
  "rvol",
  "timeframe",
  "type",
  "category",
  "exchange",
  "source",
] as const;

export const PREMIUM_SIGNAL_FIELDS = [
  "stop",
  "stop_loss",
  "target",
  "take_profit",
  "targets",
  "reasons",
  "indicators",
  "risk_reward",
  "riskReward",
] as const;
