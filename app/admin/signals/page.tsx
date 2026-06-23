import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminSignalsPage() {
  await requireAdmin();
  return <main className="mx-auto max-w-6xl p-6"><section className="app-card p-6"><p className="section-label">Admin</p><h1 className="mt-3 text-3xl font-black">Signals</h1><p className="mt-2 text-slate-400">Bu sayfa yalnızca server-side requireAdmin kontrolünden geçen yöneticilere açıktır.</p></section></main>;
}
