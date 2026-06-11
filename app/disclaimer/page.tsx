import Link from "next/link";

const disclaimerPoints = [
  "Kuark Terminal does not provide financial, investment, legal, or tax advice.",
  "All signals, market summaries, dashboards, scores, alerts, and related content are provided for educational and informational purposes only.",
  "You are solely responsible for your own research, risk management, portfolio choices, trades, and investment decisions.",
  "Past performance, backtested examples, historical signals, and previous market behavior do not guarantee future results.",
  "Before making any investment decision, you should consult a qualified financial, legal, tax, or other professional adviser who understands your circumstances.",
];

const riskStats = [
  { label: "Advice status", value: "Not advice" },
  { label: "Signal purpose", value: "Education" },
  { label: "Decision owner", value: "You" },
  { label: "Future returns", value: "Not guaranteed" },
];

export const metadata = {
  title: "Disclaimer | Kuark Terminal",
  description: "Educational and informational disclaimer for Kuark Terminal signals and dashboards.",
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070b] text-gray-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.65),rgba(2,6,23,0.96))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 md:px-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-4 border-b border-gray-800/80 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-blue-200">
              <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_18px_rgba(74,222,128,0.9)]" />
              Risk Disclosure
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Kuark Terminal Disclaimer
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400 md:text-base">
              Read this notice carefully before using any signal, dashboard, alert, ranking, commentary, or market data shown on this site.
            </p>
          </div>

          <Link
            href="/terminal"
            className="inline-flex items-center justify-center rounded-xl border border-gray-700 bg-[#0d1117]/90 px-4 py-2.5 text-sm font-bold text-gray-200 shadow-lg shadow-black/30 transition hover:border-blue-500 hover:bg-blue-950/30 hover:text-blue-100"
          >
            Back to Terminal
          </Link>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-3xl border border-gray-800 bg-[#0b0f14]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-black/40 p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500">Terminal Notice</p>
                <p className="mt-1 text-lg font-black text-white">No recommendation, no guarantee</p>
              </div>
              <div className="hidden rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-200 sm:block">
                High Risk
              </div>
            </div>

            <div className="space-y-4">
              {disclaimerPoints.map((point, index) => (
                <section
                  key={point}
                  className="group rounded-2xl border border-gray-800 bg-gradient-to-br from-[#111827]/80 to-black/50 p-4 transition hover:border-blue-500/40 hover:from-blue-950/20 md:p-5"
                >
                  <div className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-700 bg-[#05070b] font-mono text-sm font-black text-blue-300 group-hover:border-blue-500/60">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <p className="text-sm leading-7 text-gray-200 md:text-base">{point}</p>
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-amber-200">Important</h2>
              <p className="mt-3 text-sm leading-7 text-amber-50/90">
                Markets can be volatile, leveraged products can amplify losses, and data or automated signals may be delayed, incomplete, inaccurate, or unsuitable for your goals. Do not rely on this site as the sole basis for any financial decision.
              </p>
            </div>
          </article>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-800 bg-[#0d1117]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.22em] text-gray-300">Disclosure Matrix</h2>
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-200">
                  LIVE
                </span>
              </div>

              <div className="space-y-3">
                {riskStats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-gray-800 bg-black/35 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">{item.label}</div>
                    <div className="mt-2 font-mono text-lg font-black text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-500/25 bg-blue-500/10 p-5 shadow-2xl shadow-blue-950/20">
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Professional Guidance</h2>
              <p className="mt-3 text-sm leading-7 text-blue-50/90">
                Investment decisions should be made only after considering your financial situation, objectives, risk tolerance, tax position, and legal obligations with an appropriately qualified professional.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
