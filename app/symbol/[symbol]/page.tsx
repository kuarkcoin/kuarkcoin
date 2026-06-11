import Link from "next/link";
import { headers } from "next/headers";
import { isDailyTimeframe, isPremiumTimeframe } from "@/lib/timeframes";

type SignalRow = {
  id?: number | string | null;
  created_at?: string | null;
  symbol?: string | null;
  name?: string | null;
  signal?: string | null;
  price?: number | string | null;
  score?: number | string | null;
  rvol?: number | string | null;
  timeframe?: string | number | null;
  type?: string | null;
  category?: string | null;
  exchange?: string | null;
  source?: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getApiBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const xfProto = h.get("x-forwarded-proto");
  const proto = xfProto ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function normalized(value: unknown) {
  return String(value ?? "").trim();
}

function upper(value: unknown) {
  return normalized(value).toUpperCase();
}

function symbolToPlain(value: unknown) {
  const text = normalized(value);
  return text.includes(":") ? text.split(":").pop() ?? text : text;
}

function valueOrDash(value: unknown) {
  return normalized(value) || "—";
}

function formatTime(value: SignalRow["created_at"]) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return normalized(value) || "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: number | string | null | undefined, maximumFractionDigits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return normalized(value) || "—";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(number);
}

function formatPrice(value: SignalRow["price"]) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return normalized(value) || "—";

  const maximumFractionDigits = Math.abs(number) >= 100 ? 2 : Math.abs(number) >= 1 ? 4 : 6;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(number);
}

function signalClasses(signal: unknown) {
  const value = upper(signal);
  if (value === "BUY") return "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300";
  if (value === "SELL") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

function timeframeClasses(timeframe: unknown) {
  if (isPremiumTimeframe(timeframe)) return "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300";
  if (isDailyTimeframe(timeframe)) return "border-blue-400/40 bg-blue-400/10 text-blue-700 dark:text-blue-300";
  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

function SignalBadge({ signal }: { signal: unknown }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${signalClasses(signal)}`}>{valueOrDash(signal)}</span>;
}

function TimeframeBadge({ timeframe }: { timeframe: unknown }) {
  const helperLabel = isPremiumTimeframe(timeframe) ? "Premium" : isDailyTimeframe(timeframe) ? "Daily" : null;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${timeframeClasses(timeframe)}`}>
      <span>{valueOrDash(timeframe)}</span>
      {helperLabel ? <span className="text-[10px] uppercase tracking-wide opacity-80">{helperLabel}</span> : null}
    </span>
  );
}

async function getSignalsForSymbol(symbol: string): Promise<{ rows: SignalRow[]; error: string | null }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/signals`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return { rows: [], error: `Signals request failed (${res.status})` };
    }

    const json = await res.json();
    const rows = Array.isArray(json?.data) ? (json.data as SignalRow[]) : [];
    const requested = upper(symbol);
    const filtered = rows.filter((row) => upper(row.symbol) === requested || upper(symbolToPlain(row.symbol)) === requested);

    return { rows: filtered, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load symbol signals.";
    return { rows: [], error: message };
  }
}

export default async function SymbolPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol);
  const { rows, error } = await getSignalsForSymbol(symbol);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#0d1117] dark:text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <Link href="/signals" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
            ← Back to signals
          </Link>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{upper(symbol)}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Recent signal history for this symbol, including premium and daily timeframe labels.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-slate-500 dark:text-slate-400">Signals</div>
              <div className="text-2xl font-black">{rows.length}</div>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            Could not load symbol signals: {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <h2 className="text-lg font-black">No signals found</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No recent signals matched {upper(symbol)}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-bold">Created time</th>
                    <th className="px-4 py-3 font-bold">Signal</th>
                    <th className="px-4 py-3 font-bold">Price</th>
                    <th className="px-4 py-3 font-bold">Score</th>
                    <th className="px-4 py-3 font-bold">RVOL</th>
                    <th className="px-4 py-3 font-bold">Timeframe</th>
                    <th className="px-4 py-3 font-bold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {rows.map((row, index) => (
                    <tr key={row.id ?? `${row.symbol}-${row.created_at}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-400">{formatTime(row.created_at)}</td>
                      <td className="whitespace-nowrap px-4 py-4"><SignalBadge signal={row.signal} /></td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono">{formatPrice(row.price)}</td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono">{formatNumber(row.score, 2)}</td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono">{formatNumber(row.rvol, 2)}</td>
                      <td className="whitespace-nowrap px-4 py-4"><TimeframeBadge timeframe={row.timeframe} /></td>
                      <td className="whitespace-nowrap px-4 py-4">{valueOrDash(row.source)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
