import Link from "next/link";
import type React from "react";

type PremiumGateProps = {
  children: React.ReactNode;
  isPremium?: boolean;
};

export default function PremiumGate({ children, isPremium = false }: PremiumGateProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-yellow-400/20 bg-[#080b10] p-4 text-gray-100 shadow-2xl shadow-black/40 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.18),transparent_34%),linear-gradient(135deg,rgba(234,179,8,0.08),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent" />

      <div className="relative mx-auto flex max-w-2xl flex-col items-start gap-5 rounded-xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-300/30 bg-yellow-400/10 text-lg shadow-lg shadow-yellow-500/10">
            ✦
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-yellow-200/80">
              Premium Signal Layer
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Upgrade required</h2>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
          Unlock Premium to access full signals, 4H alerts and performance analytics.
        </p>

        <Link
          href="/pricing"
          className="inline-flex w-full items-center justify-center rounded-xl border border-yellow-300/40 bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-500/20 transition hover:-translate-y-0.5 hover:from-yellow-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:ring-offset-2 focus:ring-offset-[#080b10] sm:w-auto"
        >
          View Premium Plans
        </Link>
      </div>
    </section>
  );
}
