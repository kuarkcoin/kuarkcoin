import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, Bell, Home, Newspaper, Search, ShieldAlert, Table2, TrendingUp } from "lucide-react";
import { Badge, StatusDot } from "@/components/ui";

function marketOpen(offsetHour: number, start: number, end: number) {
  const d = new Date(Date.now() + offsetHour * 3600_000);
  const day = d.getUTCDay();
  const h = d.getUTCHours();
  return day !== 0 && day !== 6 && h >= start && h < end;
}
export function MarketStatus() {
  const bist = marketOpen(3, 10, 18);
  const us = marketOpen(-4, 9, 16);
  return <div className="grid gap-2 text-xs"><div className="flex items-center justify-between"><span className="text-slate-400">BIST</span><span className="flex items-center gap-2"><StatusDot open={bist}/>{bist?"Açık":"Kapalı"}</span></div><div className="flex items-center justify-between"><span className="text-slate-400">ABD</span><span className="flex items-center gap-2"><StatusDot open={us}/>{us?"Açık":"Kapalı"}</span></div></div>;
}
const nav = [
  ["Genel Bakış", "/", Home], ["Terminal", "/terminal", BarChart3], ["Sinyaller", "/signals", TrendingUp], ["Haberler", "/#haberler", Newspaper], ["KAP", "/#kap", Bell], ["Finansallar", "/#finansallar", Table2], ["Risk Bildirimi", "/risk-disclosure", AlertTriangle],
] as const;
export function AppSidebar() { return <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[var(--border)] bg-[var(--surface)] p-4 lg:flex lg:flex-col"><Link href="/" className="mb-6"><div className="text-xl font-black tracking-tight text-sky-300">KUARK</div><div className="text-xs font-semibold text-slate-500">Market Intelligence</div></Link><div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3"><MarketStatus/></div><nav className="space-y-1">{nav.map(([label, href, Icon]) => <Link key={label} href={href} className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-[var(--surface-hover)] hover:text-white"><Icon className="size-4 text-slate-500"/>{label}{href.includes("#") && <Badge className="ml-auto" variant="neutral">Yakında</Badge>}</Link>)}</nav><div className="mt-auto rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs leading-5 text-slate-500"><ShieldAlert className="mb-2 size-4 text-amber-300"/>Yatırım tavsiyesi değildir. Sinyaller karar desteği amaçlıdır.<Link href="/risk-disclosure" className="mt-2 block font-bold text-amber-200 hover:text-amber-100">Risk bildirimini oku</Link></div></aside>; }
export function CommandSearch() { return <div className="hidden min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-slate-500 md:flex"><Search className="size-4"/>Sembol, haber veya sinyal ara</div>; }
export function HeaderActions() { return <div className="flex items-center gap-2"><Link href="/terminal" className="focus-ring rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-100">Terminali Aç</Link></div>; }
export function AppHeader() { return <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/85 px-4 backdrop-blur lg:pl-64"><CommandSearch/><div className="ml-auto"><HeaderActions/></div></header>; }
export function MobileBottomNav() { const items = nav.slice(0,4); return <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-[calc(env(safe-area-inset-bottom)+.35rem)] pt-2 lg:hidden">{items.map(([label,href,Icon])=><Link key={label} href={href} className="focus-ring flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold text-slate-400"><Icon className="size-4"/>{label.replace("Genel Bakış","Özet")}</Link>)}</nav>; }
export default function AppShell({ children }: { children: ReactNode }) { return <div className="app-shell"><AppSidebar/><AppHeader/><main className="pb-24 lg:pl-60 lg:pb-0">{children}</main><MobileBottomNav/></div>; }
