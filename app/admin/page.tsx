import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
const items = ["signals", "users", "subscriptions", "webhooks", "audit", "system"];
export default async function AdminPage() { const user = await requireAdmin(); return <main className="mx-auto max-w-6xl p-6"><section className="app-card p-6"><p className="section-label">Admin</p><h1 className="mt-3 text-3xl font-black">Yönetim Paneli</h1><p className="mt-2 text-slate-400">Server-side admin doğrulaması tamamlandı: {user.email ?? user.id}</p><div className="mt-6 grid gap-4 md:grid-cols-3">{items.map((item)=><Link key={item} className="app-panel p-4 font-bold capitalize" href={`/admin/${item}`}>{item}</Link>)}</div></section></main>; }
