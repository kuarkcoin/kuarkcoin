import Link from "next/link";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";

type PageParams = {
  symbol: string;
};

type SearchParams = {
  plan?: string;
};

type SignalRow = {
  id?: number | string | null;
  created_at?: string | null;
  symbol?: string | null;
  name?: string | null;
  signal?: string | null;
  price?: number | string | null;
  score?: number | string | null;
  rvol?: number | string | null;
  timeframe?: string | null;
  type?: string | null;
  category?: string | null;
  exchange?: string | null;
  source?: string | null;
  reasons?: string | null;
  outcome?: string | null;
};

type Plan = "free" | "premium";

const PERFORMANCE_WINDOWS = ["7D", "30D", "90D"] as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getApiBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const xfProto = h.get("x-forwarded-proto");
  const proto = xfProto ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function getRecentSignals(): Promise<{ rows: SignalRow[]; error: string | null }> {
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
    return { rows, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load signals.";
    return { rows: [], error: message };
  }
}

function normalized(value: unknown) {
  return String(value ?? "").trim();
}

function upper(value: unknown) {
  return normalized(value).toUpperCase();
}

function stripExchangePrefix(value: string) {
  const clean = value.trim();
  return clean.includes(":") ? clean.split(":").pop() ?? clean : clean;
}

function normalizeTicker(value: unknown) {
  return stripExchangePrefix(upper(value)).replace(/[^A-Z0-9]/g, "");
}

function displayTicker(value: unknown) {
  return stripExchangePrefix(upper(value)) || "—";
}

function filterRowsBySymbol(rows: SignalRow[], routeSymbol: string) {
  const selectedTicker = normalizeTicker(decodeURIComponent(routeSymbol));
  if (!selectedTicker) return [];

  return rows
    .filter((row) => normalizeTicker(row.symbol) === selectedTicker)
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
}

function valueOrDash(value: unknown) {
  const text = normalized(value);
  return text || "—";
}

function firstValue(rows: SignalRow[], field: keyof SignalRow) {
  return valueOrDash(rows.find((row) => normalized(row[field]))?.[field]);
}

function formatTime(value: SignalRow["created_at"]) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return normalized(value) || "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
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

function resolvePlan(searchParams?: SearchParams): Plan {
  const h = headers();
  const c = cookies();
  const plan = upper(
    searchParams?.plan ??
      c.get("kuark_plan")?.value ??
      c.get("plan")?.value ??
      h.get("x-kuark-plan") ??
      h.get("x-user-plan")
  );

  return ["PREMIUM", "PRO", "PAID"].includes(plan) ? "premium" : "free";
}

function PlanBadge({ plan }: { plan: Plan }) {
  const premium = plan === "premium";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
        premium
          ? "border-amber-300/70 bg-amber-200/20 text-amber-700 dark:text-amber-200"
          : "border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
      }`}
    >
      {premium ? "Premium" : "Free"} plan
    </span>
  );
}

function PremiumGate({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-amber-400/10" />
      <div className="relative space-y-4">
        <div className="inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Premium locked
        </div>
        {children}
        <Link
          href="/signals"
          className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700"
        >
          Upgrade to unlock analytics
        </Link>
      </div>
    </section>
  );
}

function Disclaimer() {
  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      Disclaimer: Signals and analytics are informational only and are not financial advice. Always do your own
      research and manage risk before making investment decisions.
    </p>
  );
}

function InfoCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function PerformanceStats() {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Performance analytics</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Coming soon: verified performance analytics</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PERFORMANCE_WINDOWS.map((window) => (
          <div
            key={window}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80"
          >
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{window}</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Average return after BUY
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">—</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Average drawdown after SELL
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">—</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignalBadge({ signal }: { signal: unknown }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${signalClasses(signal)}`}>
      {valueOrDash(signal)}
    </span>
  );
}

function SignalCards({ rows }: { rows: SignalRow[] }) {
  return (
    <div className="grid gap-3 sm:hidden">
      {rows.map((row, index) => (
        <article
          key={row.id ?? `${row.symbol}-${row.created_at}-${index}`}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{displayTicker(row.symbol)}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatTime(row.created_at)}</p>
            </div>
            <SignalBadge signal={row.signal} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Price</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{formatPrice(row.price)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Score</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{formatNumber(row.score)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Timeframe</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{valueOrDash(row.timeframe)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Outcome</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{valueOrDash(row.outcome)}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function SignalsTable({ rows }: { rows: SignalRow[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:block">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Signal</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">RVOL</th>
            <th className="px-4 py-3">Timeframe</th>
            <th className="px-4 py-3">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row, index) => (
            <tr key={row.id ?? `${row.symbol}-${row.created_at}-${index}`}>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatTime(row.created_at)}</td>
              <td className="px-4 py-3">
                <SignalBadge signal={row.signal} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950 dark:text-white">{formatPrice(row.price)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{formatNumber(row.score)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{formatNumber(row.rvol)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{valueOrDash(row.timeframe)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{valueOrDash(row.outcome)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ symbol }: { symbol: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950/80">
      <p className="text-lg font-bold text-slate-950 dark:text-white">No signals found for {displayTicker(symbol)}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Try another ticker or check the main signals list for the latest available rows.
      </p>
      <Link
        href="/signals"
        className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-800 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-300"
      >
        View all signals
      </Link>
    </div>
  );
}

export default async function SymbolPage({ params, searchParams }: { params: PageParams; searchParams?: SearchParams }) {
  const routeSymbol = decodeURIComponent(params.symbol);
  const plan = resolvePlan(searchParams);
  const isPremium = plan === "premium";
  const { rows, error } = await getRecentSignals();
  const symbolRows = filterRowsBySymbol(rows, routeSymbol);
  const visibleRows = isPremium ? symbolRows : symbolRows.slice(0, 3);
  const latest = symbolRows[0];
  const buyCount = symbolRows.filter((row) => upper(row.signal) === "BUY").length;
  const sellCount = symbolRows.filter((row) => upper(row.signal) === "SELL").length;
  const selectedSymbol = displayTicker(latest?.symbol ?? routeSymbol);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-black dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <Link href="/signals" className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300">
                ← Back to signals
              </Link>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Symbol</p>
                <h1 className="mt-2 break-words text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {selectedSymbol}
                </h1>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Basic symbol information and signal history filtered by normalized ticker values. Free users see the latest
                3 signals; premium users see the full available history and analytics placeholders.
              </p>
            </div>
            <PlanBadge plan={plan} />
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Latest signal" value={latest ? <SignalBadge signal={latest.signal} /> : "—"} />
          <InfoCard label="Latest price" value={formatPrice(latest?.price)} />
          <InfoCard label="Signal count" value={symbolRows.length} />
          <InfoCard label="Exchange" value={firstValue(symbolRows, "exchange")} />
          <InfoCard label="Name" value={firstValue(symbolRows, "name")} />
          <InfoCard label="Category" value={firstValue(symbolRows, "category")} />
          <InfoCard label="Type" value={firstValue(symbolRows, "type")} />
          <InfoCard label="BUY / SELL" value={`${buyCount} / ${sellCount}`} />
        </section>

        {symbolRows.length ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">Signal history</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {visibleRows.length} of {symbolRows.length} matching signals.
                </p>
              </div>
              {!isPremium ? <PlanBadge plan={plan} /> : null}
            </div>
            <SignalCards rows={visibleRows} />
            <SignalsTable rows={visibleRows} />
          </section>
        ) : (
          <EmptyState symbol={routeSymbol} />
        )}

        {isPremium ? (
          <PerformanceStats />
        ) : (
          <PremiumGate>
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Performance analytics</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Upgrade to view 7D / 30D / 90D performance stat boxes, including placeholders for average return after BUY
                and average drawdown after SELL.
              </p>
            </div>
          </PremiumGate>
        )}

        <Disclaimer />
      </div>
    </main>
  );
}
