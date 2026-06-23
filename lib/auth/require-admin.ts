import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { appendSafeNextParam } from "@/lib/auth/safe-redirect";

function metadataRole(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) return null;
  return String(user.app_metadata?.role ?? user.user_metadata?.role ?? "").toLowerCase();
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect(appendSafeNextParam("/login", "/admin"));

  if (metadataRole(user) === "admin") return user;

  const supabase = supabaseServer();
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (String(data?.role ?? "").toLowerCase() === "admin") return user;

  redirect("/account");
}
