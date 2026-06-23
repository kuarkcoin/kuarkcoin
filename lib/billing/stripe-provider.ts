import crypto from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import type { BillingProvider, BillingResult, BillingWebhookResult, CheckoutInput, PortalInput } from "./provider";

const disabledMessage = "Ödeme sistemi henüz etkin değil";

function isConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

function priceIdFor(interval: CheckoutInput["interval"]) {
  return interval === "yearly" ? process.env.STRIPE_PRICE_ID_YEARLY : process.env.STRIPE_PRICE_ID_MONTHLY;
}

async function stripePost(path: string, params: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? "Stripe request failed");
  return data;
}

function verifyStripeSignature(payload: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
    const [key, value] = part.split("=", 2);
    return [key, value];
  }));
  const timestamp = parts.t;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const signatures = signatureHeader.split(",").filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));

  return signatures.some((signature) => {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

async function markEventProcessing(eventId: string) {
  const supa = supabaseServer();
  const { error } = await supa.from("webhook_events").insert({ id: eventId, provider: "stripe", processed_at: null });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate") || message.includes("already exists")) return false;
    throw new Error(error.message);
  }
  return true;
}

async function markEventProcessed(eventId: string) {
  const supa = supabaseServer();
  await supa.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", eventId);
}

async function syncSubscription(event: any) {
  const object = event.data?.object;
  const userId = object?.metadata?.userId ?? object?.metadata?.user_id;
  if (!userId) return;

  const supa = supabaseServer();
  await supa.from("subscriptions").upsert(
    {
      user_id: userId,
      provider: "stripe",
      provider_customer_id: object.customer ?? null,
      provider_subscription_id: object.subscription ?? object.id ?? null,
      status: object.status ?? (event.type === "checkout.session.completed" ? "active" : null),
      current_period_end: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export function createStripeBillingProvider(): BillingProvider {
  return {
    name: "stripe",

    async createCheckoutSession(input: CheckoutInput): Promise<BillingResult> {
      if (!isConfigured()) return { ok: false, message: disabledMessage };
      const priceId = priceIdFor(input.interval ?? "monthly");
      if (!priceId) return { ok: false, message: disabledMessage };

      const params = new URLSearchParams({
        mode: "subscription",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "metadata[userId]": input.userId,
        "subscription_data[metadata][userId]": input.userId,
      });
      if (input.email) params.set("customer_email", input.email);

      const session = await stripePost("checkout/sessions", params);
      return { ok: true, url: session.url, data: { id: session.id } };
    },

    async createPortalSession(input: PortalInput): Promise<BillingResult> {
      if (!process.env.STRIPE_SECRET_KEY || !input.customerId) return { ok: false, message: disabledMessage };
      const session = await stripePost("billing_portal/sessions", new URLSearchParams({ customer: input.customerId, return_url: input.returnUrl }));
      return { ok: true, url: session.url, data: { id: session.id } };
    },

    async handleWebhook(payload: string, headers: Headers): Promise<BillingWebhookResult> {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret || !verifyStripeSignature(payload, headers.get("stripe-signature"), secret)) {
        return { ok: false, message: "Invalid Stripe webhook signature" };
      }

      const event = JSON.parse(payload);
      const shouldProcess = await markEventProcessing(event.id);
      if (!shouldProcess) return { ok: true, duplicate: true };

      if (["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
        await syncSubscription(event);
      }

      await markEventProcessed(event.id);
      return { ok: true };
    },
  };
}
