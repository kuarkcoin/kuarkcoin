import Link from "next/link";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";

export default function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = getSafeRedirectPath(searchParams?.next, "/account");
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6"><section className="app-card p-6"><p className="section-label">KuarkCoin Auth</p><h1 className="mt-3 text-3xl font-black">Giriş yap</h1><p className="mt-2 text-sm text-slate-400">Supabase Auth ile oturum açın. Başarılı girişten sonra güvenli yönlendirme hedefi: <span className="font-mono text-sky-200">{next}</span></p><form className="mt-6 space-y-3"><input name="email" type="email" placeholder="E-posta" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"/><input name="password" type="password" placeholder="Şifre" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"/><input type="hidden" name="next" value={next}/><button className="w-full rounded-xl bg-sky-500 px-4 py-3 font-black text-slate-950" type="button">Giriş yap</button></form><div className="mt-4 flex justify-between text-sm text-sky-300"><Link href="/register">Hesap oluştur</Link><Link href="/forgot-password">Şifremi unuttum</Link></div></section></main>;
}
