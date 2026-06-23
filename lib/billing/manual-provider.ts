import { supabaseServer } from "@/lib/supabaseServer";
import type {
  BillingResult,
  BillingWebhookResult,
  ManualBillingProvider,
  ManualPremiumMutation,
  ManualTrialMutation,
} from "./provider";

const disabledMessage = "Ödeme sistemi henüz etkin değil";

type AuditAction = "activate_premium" | "cancel_premium" | "start_trial" | "set_premium_end_date";

async function writeAuditLog(action: AuditAction, input: ManualPremiumMutation, metadata: Record<string, unknown> = {}) {
  const supa = supabaseServer();
  const { error } = await supa.from("billing_audit_logs").insert({
    action,
    admin_id: input.adminId,
    user_id: input.userId,
    reason: input.reason ?? null,
    metadata,
  });

  if (error) throw new Error(error.message);
}

async function upsertSubscription(
  input: ManualPremiumMutation,
  status: "active" | "trialing" | "canceled",
  extra: Record<string, unknown> = {},
) {
  const supa = supabaseServer();
  const { data, error } = await supa
    .from("subscriptions")
    .upsert(
      {
        user_id: input.userId,
        provider: "manual",
        status,
        current_period_end: input.endsAt ?? null,
        updated_at: new Date().toISOString(),
        ...extra,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message } satisfies BillingResult;
  return { ok: true, data } satisfies BillingResult;
}

export function createManualBillingProvider(): ManualBillingProvider {
  return {
    name: "manual",

    async createCheckoutSession() {
      return { ok: false, message: disabledMessage };
    },

    async createPortalSession() {
      return { ok: false, message: disabledMessage };
    },

    async handleWebhook(): Promise<BillingWebhookResult> {
      return { ok: true, message: "Manual provider webhook ignored" };
    },

    async activatePremium(input: ManualPremiumMutation) {
      const result = await upsertSubscription(input, "active");
      if (!result.ok) return result;
      await writeAuditLog("activate_premium", input, { endsAt: input.endsAt ?? null });
      return result;
    },

    async cancelPremium(input: ManualPremiumMutation) {
      const result = await upsertSubscription(input, "canceled", { canceled_at: new Date().toISOString() });
      if (!result.ok) return result;
      await writeAuditLog("cancel_premium", input);
      return result;
    },

    async startTrial(input: ManualTrialMutation) {
      const result = await upsertSubscription(input, "trialing", {
        trial_end: input.trialEndsAt,
        current_period_end: input.trialEndsAt,
      });
      if (!result.ok) return result;
      await writeAuditLog("start_trial", input, { trialEndsAt: input.trialEndsAt });
      return result;
    },

    async setPremiumEndDate(input: ManualPremiumMutation & { endsAt: string | null }) {
      const result = await upsertSubscription(input, "active");
      if (!result.ok) return result;
      await writeAuditLog("set_premium_end_date", input, { endsAt: input.endsAt });
      return result;
    },
  };
}
