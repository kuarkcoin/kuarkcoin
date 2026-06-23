import { cookies, headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
}

function getBearerToken() {
  const authorization = headers().get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();

  const store = cookies();
  return (
    store.get("sb-access-token")?.value ??
    store.get("supabase-auth-token")?.value ??
    store.getAll().find((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"))?.value
  );
}

function parsePossibleToken(raw: string | undefined) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return String(parsed[0] ?? "");
    if (typeof parsed === "object" && parsed && "access_token" in parsed) return String(parsed.access_token ?? "");
  } catch {
    // Plain JWT cookie.
  }
  return raw;
}

export async function getCurrentUser(): Promise<User | null> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const token = parsePossibleToken(getBearerToken());
  if (!url || !anonKey || !token) return null;

  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}
