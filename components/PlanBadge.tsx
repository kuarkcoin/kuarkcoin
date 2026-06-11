import clsx from "clsx";
import type { HTMLAttributes } from "react";

export type PlanBadgeType = "FREE" | "PREMIUM" | "LOCKED" | "4H FAST";

type PlanBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  type: PlanBadgeType;
  label?: string;
};

const badgeStyles: Record<PlanBadgeType, string> = {
  FREE: clsx(
    "border-slate-300 bg-slate-100 text-slate-700",
    "dark:border-slate-600/70 dark:bg-slate-800/80 dark:text-slate-200"
  ),
  PREMIUM: clsx(
    "border-yellow-300 bg-yellow-100 text-yellow-800 shadow-yellow-500/10",
    "dark:border-yellow-400/50 dark:bg-yellow-400/15 dark:text-yellow-200"
  ),
  LOCKED: clsx(
    "border-zinc-200 bg-zinc-100 text-zinc-500 opacity-80",
    "dark:border-zinc-700/70 dark:bg-zinc-800/60 dark:text-zinc-400"
  ),
  "4H FAST": clsx(
    "border-orange-300 bg-orange-100 text-orange-800 shadow-orange-500/10",
    "dark:border-orange-400/60 dark:bg-orange-500/15 dark:text-orange-200"
  ),
};

export default function PlanBadge({ type, label, className, ...props }: PlanBadgeProps) {
  const displayLabel = label ?? type;

  return (
    <span
      aria-label={displayLabel}
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase leading-5 tracking-wide shadow-sm",
        badgeStyles[type],
        className
      )}
      {...props}
    >
      {displayLabel}
    </span>
  );
}
