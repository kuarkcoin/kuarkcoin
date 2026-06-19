import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Search } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(" "); }

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "buy" | "sell";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border-sky-500/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
  secondary: "border-[var(--border)] bg-[var(--surface-elevated)] text-slate-200 hover:bg-[var(--surface-hover)]",
  ghost: "border-transparent bg-transparent text-slate-300 hover:bg-[var(--surface-hover)]",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
  buy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
  sell: "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
};
export function Button({ className, variant = "secondary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={cx("focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50", buttonVariants[variant], className)} {...props} />;
}
export function LinkButton({ className, variant = "secondary", href, children }: { href: string; children: ReactNode; className?: string; variant?: ButtonVariant }) {
  return <Link href={href} className={cx("focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-bold transition-colors", buttonVariants[variant], className)}>{children}</Link>;
}
export function IconButton({ label, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={cx("focus-ring inline-flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-slate-300 transition-colors hover:bg-[var(--surface-hover)]", className)} {...props}>{children}</button>;
}
export function Badge({ variant="neutral", className, children }: { variant?: "default"|"accent"|"buy"|"sell"|"warning"|"neutral"; className?: string; children: ReactNode }) {
 const v={default:"border-slate-600/30 bg-slate-500/10 text-slate-200",accent:"border-sky-500/30 bg-sky-500/10 text-sky-200",buy:"border-emerald-500/30 bg-emerald-500/10 text-emerald-200",sell:"border-rose-500/30 bg-rose-500/10 text-rose-200",warning:"border-amber-500/30 bg-amber-500/10 text-amber-200",neutral:"border-[var(--border)] bg-[var(--surface)] text-slate-300"}[variant];
 return <span className={cx("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold",v,className)}>{children}</span>;
}
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cx("app-card", className)} {...props} />; }
export function Skeleton({ className }: { className?: string }) { return <div className={cx("animate-pulse rounded-lg bg-slate-700/30", className)} />; }
export function EmptyState({ title, description }: { title: string; description?: string }) { return <div className="app-panel p-6 text-center"><div className="font-bold text-slate-200">{title}</div>{description && <p className="mt-1 text-sm text-slate-400">{description}</p>}</div>; }
export function StatusDot({ open }: { open: boolean }) { return <span className={cx("size-2 rounded-full", open ? "bg-emerald-400" : "bg-slate-500")} />; }
export function SectionHeader({ title, action, eyebrow }: { title: string; action?: ReactNode; eyebrow?: string }) { return <div className="flex items-end justify-between gap-3"><div>{eyebrow && <div className="section-label mb-1">{eyebrow}</div>}<h2 className="text-base font-black tracking-tight text-slate-50">{title}</h2></div>{action}</div>; }
export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) { return <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"/><input {...props} className={cx("focus-ring min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500", props.className)} /></div>; }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={cx("focus-ring min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-slate-100", props.className)} />; }
export function SegmentedControl<T extends string>({ options, value, onChange }: { options: { label: string; value: T; href?: string }[]; value: T; onChange?: (value:T)=>void }) { return <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">{options.map(o => o.href ? <Link key={o.value} href={o.href} className={cx("focus-ring rounded-md px-3 py-1.5 text-xs font-bold transition-colors", value===o.value ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200")}>{o.label}</Link> : <button key={o.value} onClick={()=>onChange?.(o.value)} className={cx("focus-ring rounded-md px-3 py-1.5 text-xs font-bold transition-colors", value===o.value ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200")}>{o.label}</button>)}</div>; }
export function Tooltip({ label, children }: { label:string; children:ReactNode }) { return <span title={label}>{children}</span>; }
export function Drawer({ children, open }: { children: ReactNode; open: boolean }) { return open ? <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl lg:hidden">{children}</div> : null; }
export function Tabs(props: { children: ReactNode }) { return <div>{props.children}</div>; }
