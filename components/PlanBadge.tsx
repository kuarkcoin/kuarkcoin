type PlanBadgeVariant = "free" | "premium";

type PlanBadgeProps = {
  variant: PlanBadgeVariant;
};

const planBadgeStyles: Record<PlanBadgeVariant, string> = {
  free: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-cyan-400/10",
  premium: "border-amber-300/50 bg-amber-300/10 text-amber-100 shadow-amber-300/10",
};

export default function PlanBadge({ variant }: PlanBadgeProps) {
  const label = variant.toUpperCase();

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black tracking-[0.24em] shadow-lg ${planBadgeStyles[variant]}`}
    >
      {label}
    </span>
  );
}
