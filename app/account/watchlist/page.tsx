import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { appendSafeNextParam } from "@/lib/auth/safe-redirect";
export default async function WatchlistPage() { const user=await getCurrentUser(); if(!user) redirect(appendSafeNextParam("/login","/account/watchlist")); return <main className="mx-auto max-w-4xl p-6"><section className="app-card p-6"><p className="section-label">Hesap</p><h1 className="mt-3 text-3xl font-black">Watchlist</h1><p className="mt-2 text-slate-400">Takip ettiğiniz semboller ve uyarılar burada gösterilir.</p></section></main>; }
