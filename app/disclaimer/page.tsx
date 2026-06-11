import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

export const metadata = {
  title: "Disclaimer | EnglishMeter",
  description: "Financial and educational use disclaimer for EnglishMeter signals.",
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 dark:bg-[#0d1117] dark:text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
          ← Back to home
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Disclaimer</h1>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <Disclaimer />
          </div>
        </header>

        <div className="mt-8 space-y-5 text-base leading-7 text-slate-700 dark:text-slate-300">
          <p>This site does not provide financial advice, investment advice, trading advice, or any other professional financial recommendation.</p>
          <p>Signals are for educational and informational purposes only and should not be treated as instructions to buy, sell, hold, or otherwise trade any asset.</p>
          <p>Users should do their own research, evaluate their own financial circumstances, and consult a qualified professional before making financial decisions.</p>
          <p>Trading involves risk, including the potential loss of principal, and may not be suitable for every user.</p>
          <p>Past performance does not guarantee future results, and no signal, model, or analysis can ensure profitable outcomes.</p>
        </div>
      </section>
    </main>
  );
}
