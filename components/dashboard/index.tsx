import type { ReactNode } from "react";
import { Activity, AlertTriangle, BarChart3 } from "lucide-react";
import { Card, EmptyState as UiEmptyState, Skeleton } from "@/components/ui";

export function MetricCard({ label, value, description, icon }: { label: string; value: ReactNode; description?: string; icon?: ReactNode }) {
  return <Card className="p-4"><div className="mb-3 text-sky-300">{icon ?? <Activity className="size-4" />}</div><div className="text-xs font-bold text-slate-500">{label}</div><div className="metric-value mt-1 text-2xl">{value}</div>{description && <div className="mt-1 text-xs text-slate-500">{description}</div>}</Card>;
}
export function DashboardSection({ title, children }: { title: string; children: ReactNode }) { return <Card className="p-4"><h2 className="text-base font-black">{title}</h2><div className="mt-4">{children}</div></Card>; }
export function MarketBreadthCard({ buy, sell }: { buy: number; sell: number }) { const total=buy+sell; const buyPct=total?Math.round((buy/total)*100):0; return <Card className="p-4"><div className="section-label mb-2">Piyasa dağılımı</div><div className="flex items-center justify-between text-sm"><span>BUY {buy}</span><span>SELL {sell}</span><span>Toplam {total}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-rose-500/15" aria-label={`BUY ${buy}, SELL ${sell}, toplam ${total}`}><div className="h-full bg-emerald-400/70" style={{width:`${buyPct}%`}} /></div></Card>; }
export function TopSignalCard({ symbol, children }: { symbol: string; children?: ReactNode }) { return <Card className="p-4"><div className="section-label mb-2">Öne çıkan sinyal</div><div className="font-mono text-2xl font-black">{symbol}</div>{children}</Card>; }
export function SignalDistribution({ children }: { children: ReactNode }) { return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>; }
export function EmptyState(props: { title: string; description?: string }) { return <UiEmptyState {...props} />; }
export function ErrorState({ title = "Veriler güncellenirken bir sorun oluştu." }: { title?: string }) { return <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"><AlertTriangle className="mb-2 size-4" />{title}</div>; }
export function LoadingSkeleton() { return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28"/><Skeleton className="h-28"/><Skeleton className="h-28"/><Skeleton className="h-28"/></div>; }
export function ChartPlaceholder() { return <div className="flex min-h-52 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-slate-500"><BarChart3 className="mr-2 size-4"/>Grafik alanı</div>; }
