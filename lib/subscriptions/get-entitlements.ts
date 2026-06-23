import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ADMIN_SIGNAL_ENTITLEMENT,
  FREE_SIGNAL_ENTITLEMENT,
  PREMIUM_SIGNAL_ENTITLEMENT,
  type SignalEntitlement,
} from "./plans";

type Metadata = Record<string, unknown>;

function extractBearerToken(req: Request) {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function parseAuthTokenPayload(payload: string) {
  const parsed = JSON.parse(payload);
  if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
  if (typeof parsed?.access_token === "string") return parsed.access_token;
  return null;
}

function decodeSupabaseCookieValue(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    const payload = decoded.startsWith("base64-")
      ? Buffer.from(decoded.slice("base64-".length), "base64").toString("utf8")
      : decoded;

    return parseAuthTokenPayload(payload);
  } catch {}
  return null;
}

function extractCookieToken(req: Request) {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;

  for (const part of cookie.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    const value = rawValue.join("=");
    if (!rawName || !value) continue;
    if (rawName.startsWith("sb-") && rawName.endsWith("-auth-token")) {
      const token = decodeSupabaseCookieValue(value);
      if (token) return token;
    }
  }

  return null;
}

function normalizePlan(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function entitlementForUser(user: User | null): SignalEntitlement {
  if (!user) return FREE_SIGNAL_ENTITLEMENT;

  const app = (user.app_metadata ?? {}) as Metadata;
  const meta = (user.user_metadata ?? {}) as Metadata;
  const plan = normalizePlan(app.plan ?? app.subscription_plan ?? app.role ?? meta.plan ?? meta.subscription_plan ?? meta.role);

  if (plan === "admin") return ADMIN_SIGNAL_ENTITLEMENT;
  if (plan === "premium" || plan === "pro" || plan === "paid") return PREMIUM_SIGNAL_ENTITLEMENT;

  return FREE_SIGNAL_ENTITLEMENT;
}

export async function getSignalEntitlement(req: Request, supa: SupabaseClient): Promise<SignalEntitlement> {
  const token = extractBearerToken(req) ?? extractCookieToken(req);
  if (!token) return FREE_SIGNAL_ENTITLEMENT;

  const { data, error } = await supa.auth.getUser(token);
  if (error) return FREE_SIGNAL_ENTITLEMENT;

  return entitlementForUser(data.user ?? null);
}
