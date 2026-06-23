import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { appendSafeNextParam } from "@/lib/auth/safe-redirect";

export default async function AccountPage() { const user = await getCurrentUser(); if (!user) redirect(appendSafeNextParam("/login", "/account")); return <main className="mx-auto max-w-5xl p-6"><section className="app-card p-6"><p className="section-label">Hesap</p><h1 className="mt-3 text-3xl font-black">Hesabım</h1><p className="mt-2 text-slate-400">Oturum: {user.email ?? user.id}</p><div className="mt-6 grid gap-4 md:grid-cols-2"><Link className="app-panel p-4" href="/account/subscription">Abonelik</Link><Link className="app-panel p-4" href="/account/watchlist">Watchlist</Link></div></section></main>; }
