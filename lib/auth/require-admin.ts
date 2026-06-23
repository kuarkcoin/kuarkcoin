import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AdminAuthResult =
  | { ok: true; actor: string; source: "session" | "secret" }
  | { ok: false; status: 401 | 403; error: string };

function supabaseAnonClient() {
  const url = process.env.SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase auth env missing");

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;

    const cookieName = cookie.slice(0, separator);
    if (cookieName !== name) continue;

    return decodeURIComponent(cookie.slice(separator + 1));
  }

  return null;
}

function tokenFromSupabaseCookie(value: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
  } catch {
    return value;
  }

  return value;
}

function getAccessToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = req.headers.get("cookie");
  return (
    getCookieValue(cookieHeader, "sb-access-token") ??
    tokenFromSupabaseCookie(getCookieValue(cookieHeader, "supabase-auth-token"))
  );
}

function getSecretFromRequest(req: Request, body: unknown) {
  const headerSecret = req.headers.get("x-signals-admin-secret");
  if (headerSecret) return headerSecret;

  if (body && typeof body === "object" && "secret" in body) {
    const secret = (body as { secret?: unknown }).secret;
    return typeof secret === "string" ? secret : null;
  }

  return null;
}

export async function requireAdmin(
  req: Request,
  body: unknown,
  supa: SupabaseClient,
): Promise<AdminAuthResult> {
  const accessToken = getAccessToken(req);

  if (accessToken) {
    const authClient = supabaseAnonClient();
    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }

    const { data: profile, error: profileError } = await supa
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return { ok: false, status: 403, error: "Forbidden" };
    }

    return { ok: true, actor: userData.user.id, source: "session" };
  }

  const configuredSecret = process.env.SIGNALS_ADMIN_SECRET;
  const requestSecret = getSecretFromRequest(req, body);
  if (configuredSecret && requestSecret && requestSecret === configuredSecret) {
    return { ok: true, actor: "SIGNALS_ADMIN_SECRET", source: "secret" };
  }

  return { ok: false, status: 401, error: "Unauthorized" };
}
