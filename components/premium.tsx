import type { ReactNode } from "react";

type PlanBadgeProps = {
  type: "FREE" | "PREMIUM" | "LOCKED" | "4H FAST" | string;
};

type PremiumGateProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
};

function badgeClasses(type: string) {
  const normalized = type.trim().toUpperCase();
  if (normalized === "PREMIUM" || normalized === "4H FAST") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (normalized === "LOCKED") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

export function PlanBadge({ type }: PlanBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${badgeClasses(type)}`}>
      {type}
    </span>
  );
}

export function PremiumGate({ title = "Premium feature", description, children }: PremiumGateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <PlanBadge type="LOCKED" />
          <h2 className="mt-3 text-base font-black text-slate-950 dark:text-white">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p> : null}
        </div>
        <PlanBadge type="PREMIUM" />
      </div>
      {children}
    </div>
  );
}

export function Disclaimer() {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
      Signals are provided for informational and educational purposes only and are not financial advice. Always do your own research and consider your risk tolerance before making investment decisions.
    </aside>
  );
}
