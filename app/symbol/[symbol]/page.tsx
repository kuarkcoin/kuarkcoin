import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

type SymbolPageProps = {
  params: {
    symbol: string;
  };
};

export function generateMetadata({ params }: SymbolPageProps) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();

  return {
    title: `${symbol} | EnglishMeter`,
    description: `Signal details and research context for ${symbol}.`,
  };
}

export default function SymbolPage({ params }: SymbolPageProps) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 dark:bg-[#0d1117] dark:text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <Link href="/signals" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
          ← Back to signals
        </Link>

        <header className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Symbol</p>
          <h1 className="mt-2 font-mono text-3xl font-black tracking-tight sm:text-4xl">{symbol}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Review market signal context and perform your own research before making any trading decisions.
          </p>
        </header>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <Disclaimer />
        </div>
      </section>
    </main>
  );
}
