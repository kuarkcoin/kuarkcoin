import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import PlanBadge from "@/components/PlanBadge";

type Plan = {
  name: "Free" | "Premium";
  badge: "free" | "premium";
  description: string;
  accent: string;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Free",
    badge: "free",
    description: "Start with a focused market pulse and learn how signals behave before upgrading.",
    accent: "from-cyan-400/20 via-sky-500/10 to-transparent",
    features: [
      "Latest 10 signals",
      "Daily signals only",
      "Basic filters",
      "Limited symbol details",
      "Educational use only",
    ],
  },
  {
    name: "Premium",
    badge: "premium",
    description: "Unlock the full terminal workflow for faster screening, tracking, and exports.",
    accent: "from-amber-300/25 via-orange-500/10 to-transparent",
    features: [
      "Full access to 100 tracked stocks & ETFs",
      "4H Fast Signals",
      "Advanced filters",
      "Symbol performance pages",
      "7D / 30D / 90D performance stats",
      "Watchlist",
      "Email / Telegram alerts",
      "CSV export",
      "Priority new features",
    ],
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/80 p-5 shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:border-slate-500/80 sm:p-6">
      <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-br ${plan.accent}`} />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:28px_28px] opacity-60" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <PlanBadge variant={plan.badge} />
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white">{plan.name}</h2>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-xs text-emerald-200">
            LIVE
          </span>
        </div>

        <p className="mt-4 min-h-12 text-sm leading-6 text-slate-300">{plan.description}</p>

        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />

        <ul className="mt-6 space-y-3 text-sm text-slate-200">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-3">
              <span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full border border-emerald-300/40 bg-emerald-400/10 text-[10px] text-emerald-200">
                ✓
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/signals"
          className="mt-8 inline-flex items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/15 px-5 py-3 text-sm font-bold text-blue-100 transition hover:border-blue-300 hover:bg-blue-500/25"
        >
          Open signals terminal
        </Link>
      </div>
    </article>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="relative isolate overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute left-1/2 top-0 -z-10 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <header className="rounded-3xl border border-slate-700/70 bg-black/40 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/signals" className="text-sm font-semibold text-blue-300 transition hover:text-blue-200">
                ← Back to signals
              </Link>
              <Link href="/" className="text-sm font-semibold text-slate-400 transition hover:text-slate-200">
                Home
              </Link>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-300">KuarkCoin terminal pricing</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Pick the signal feed that matches your workflow.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                  Compare plan access in a dark, trading-terminal layout designed for quick scanning across desktop,
                  tablet, and mobile screens.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 font-mono text-xs text-emerald-100">
                <div className="flex items-center justify-between border-b border-emerald-300/20 pb-2">
                  <span>MARKET_ACCESS</span>
                  <span>ONLINE</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <span>TRACKED</span>
                  <span className="text-right text-white">100 symbols</span>
                  <span>CADENCE</span>
                  <span className="text-right text-white">Daily / 4H</span>
                  <span>EXPORT</span>
                  <span className="text-right text-white">CSV</span>
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-5 lg:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>

          <Disclaimer />
        </div>
      </section>
    </main>
  );
}
