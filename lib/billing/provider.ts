export type BillingProviderName = "manual" | "stripe";

export type BillingInterval = "monthly" | "yearly";

export type CheckoutInput = {
  userId: string;
  email?: string;
  interval?: BillingInterval;
  successUrl: string;
  cancelUrl: string;
};

export type BillingResult = {
  ok: boolean;
  message?: string;
  url?: string;
  data?: unknown;
};

export type PortalInput = {
  userId: string;
  customerId?: string;
  returnUrl: string;
};

export type BillingWebhookResult = {
  ok: boolean;
  duplicate?: boolean;
  message?: string;
};

export type PremiumStatus = "active" | "trialing" | "canceled" | "expired";

export type ManualPremiumMutation = {
  adminId: string;
  userId: string;
  reason?: string;
  endsAt?: string | null;
};

export type ManualTrialMutation = ManualPremiumMutation & {
  trialEndsAt: string;
};

export interface BillingProvider {
  name: BillingProviderName;
  createCheckoutSession(input: CheckoutInput): Promise<BillingResult>;
  createPortalSession(input: PortalInput): Promise<BillingResult>;
  handleWebhook(payload: string, headers: Headers): Promise<BillingWebhookResult>;
}

export interface ManualBillingProvider extends BillingProvider {
  activatePremium(input: ManualPremiumMutation): Promise<BillingResult>;
  cancelPremium(input: ManualPremiumMutation): Promise<BillingResult>;
  startTrial(input: ManualTrialMutation): Promise<BillingResult>;
  setPremiumEndDate(input: ManualPremiumMutation & { endsAt: string | null }): Promise<BillingResult>;
}
