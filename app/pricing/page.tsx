import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

export const metadata = {
  title: "Pricing | EnglishMeter",
  description: "EnglishMeter pricing information.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 dark:bg-[#0d1117] dark:text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
          ← Back to home
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Pricing</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Choose the plan that fits your market research workflow.
          </p>
        </header>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <Disclaimer />
        </div>
      </section>
    </main>
  );
}
