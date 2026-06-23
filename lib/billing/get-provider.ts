import { createManualBillingProvider } from "./manual-provider";
import { createStripeBillingProvider } from "./stripe-provider";
import type { BillingProvider, BillingProviderName, ManualBillingProvider } from "./provider";

export function getPaymentProviderName(): BillingProviderName {
  return process.env.PAYMENT_PROVIDER === "stripe" ? "stripe" : "manual";
}

export function getBillingProvider(): BillingProvider {
  return getPaymentProviderName() === "stripe" ? createStripeBillingProvider() : createManualBillingProvider();
}

export function getManualBillingProvider(): ManualBillingProvider {
  return createManualBillingProvider();
}
