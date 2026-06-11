import Link from "next/link";
import { headers } from "next/headers";

type SearchParams = {
  asset?: string;
  signal?: string;
  category?: string;
  symbol?: string;
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
};

const ASSET_FILTERS = [
  { label: "All", value: "all" },
  { label: "Stocks", value: "stocks" },
  { label: "ETFs", value: "etfs" },
] as const;

const SIGNAL_FILTERS = [
  { label: "All signals", value: "all" },
  { label: "BUY", value: "BUY" },
  { label: "SELL", value: "SELL" },
] as const;

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

function isEtf(row: SignalRow) {
  return [row.type, row.category, row.source]
    .map(upper)
    .some((value) => value === "ETF" || value === "ETFS" || value.includes("ETF"));
}

function isStock(row: SignalRow) {
  const type = upper(row.type);
  if (isEtf(row)) return false;
  if (!type) return true;
  return ["STOCK", "STOCKS", "EQUITY", "EQUITIES", "SHARE", "SHARES"].includes(type);
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

function valueOrDash(value: unknown) {
  const text = normalized(value);
  return text || "—";
}

function buildQuery(params: SearchParams, patch: Partial<SearchParams>) {
  const next = new URLSearchParams();
  const merged: SearchParams = { ...params, ...patch };

  for (const [key, rawValue] of Object.entries(merged)) {
    const value = normalized(rawValue);
    if (!value || value.toLowerCase() === "all") continue;
    next.set(key, value);
  }

  const qs = next.toString();
  return qs ? `/signals?${qs}` : "/signals";
}

function filterRows(rows: SignalRow[], params: SearchParams) {
  const asset = normalized(params.asset || "all").toLowerCase();
  const signal = upper(params.signal || "all");
  const category = normalized(params.category);
  const symbol = upper(params.symbol);

  return rows.filter((row) => {
    if (asset === "stocks" && !isStock(row)) return false;
    if (asset === "etfs" && !isEtf(row)) return false;
    if (signal !== "ALL" && upper(row.signal) !== signal) return false;
    if (category && normalized(row.category) !== category) return false;
    if (symbol && !upper(row.symbol).includes(symbol)) return false;
    return true;
  });
}

function uniqueCategories(rows: SignalRow[]) {
  return Array.from(new Set(rows.map((row) => normalized(row.category)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function signalClasses(signal: unknown) {
  const value = upper(signal);
  if (value === "BUY") return "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300";
  if (value === "SELL") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-500/20"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-300"
      }`}
    >
      {children}
    </Link>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function SignalBadge({ signal }: { signal: unknown }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${signalClasses(signal)}`}>{valueOrDash(signal)}</span>;
}

export default async function SignalsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ?? {};
  const { rows, error } = await getRecentSignals();
  const categories = uniqueCategories(rows);
  const filteredRows = filterRows(rows, params);
  const activeAsset = normalized(params.asset || "all").toLowerCase();
  const activeSignal = upper(params.signal || "all");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#0d1117] dark:text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
                ← Back to home
              </Link>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Recent Signals</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Fresh market signals from the live API. Use filters to narrow by asset class, direction, category, or symbol.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-slate-500 dark:text-slate-400">Showing</div>
              <div className="text-2xl font-black">{filteredRows.length}</div>
              <div className="text-xs text-slate-500 dark:text-slate-500">of {rows.length} recent signals</div>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2" aria-label="Asset filters">
              {ASSET_FILTERS.map((filter) => (
                <FilterLink
                  key={filter.value}
                  href={buildQuery(params, { asset: filter.value })}
                  active={activeAsset === filter.value || (!activeAsset && filter.value === "all")}
                >
                  {filter.label}
                </FilterLink>
              ))}
            </div>

            <div className="flex flex-wrap gap-2" aria-label="Signal filters">
              {SIGNAL_FILTERS.map((filter) => (
                <FilterLink
                  key={filter.value}
                  href={buildQuery(params, { signal: filter.value })}
                  active={activeSignal === upper(filter.value) || (!activeSignal && filter.value === "all")}
                >
                  {filter.label}
                </FilterLink>
              ))}
            </div>

            <form action="/signals" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input type="hidden" name="asset" value={activeAsset === "all" ? "" : activeAsset} />
              <input type="hidden" name="signal" value={activeSignal === "ALL" ? "" : activeSignal} />

              <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Category
                <select
                  name="category"
                  defaultValue={normalized(params.category)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Symbol search
                <input
                  name="symbol"
                  defaultValue={normalized(params.symbol)}
                  placeholder="Search ticker, e.g. AAPL"
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
              </label>

              <div className="flex items-end gap-2">
                <button className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500" type="submit">
                  Apply
                </button>
                <Link
                  href="/signals"
                  className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700"
                >
                  Reset
                </Link>
              </div>
            </form>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            Could not load recent signals: {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          {filteredRows.length === 0 ? (
            <div className="p-8 text-center">
              <h2 className="text-lg font-black">No signals found</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Try changing the filters or clearing the symbol search.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-bold">Created time</th>
                      <th className="px-4 py-3 font-bold">Symbol</th>
                      <th className="px-4 py-3 font-bold">Name</th>
                      <th className="px-4 py-3 font-bold">Signal</th>
                      <th className="px-4 py-3 font-bold">Price</th>
                      <th className="px-4 py-3 font-bold">Score</th>
                      <th className="px-4 py-3 font-bold">RVOL</th>
                      <th className="px-4 py-3 font-bold">Timeframe</th>
                      <th className="px-4 py-3 font-bold">Type</th>
                      <th className="px-4 py-3 font-bold">Category</th>
                      <th className="px-4 py-3 font-bold">Exchange</th>
                      <th className="px-4 py-3 font-bold">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                    {filteredRows.map((row, index) => (
                      <tr key={row.id ?? `${row.symbol}-${row.created_at}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-400">{formatTime(row.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-mono font-black">{valueOrDash(row.symbol)}</td>
                        <td className="max-w-[220px] px-4 py-4 text-slate-700 dark:text-slate-300">{valueOrDash(row.name)}</td>
                        <td className="whitespace-nowrap px-4 py-4"><SignalBadge signal={row.signal} /></td>
                        <td className="whitespace-nowrap px-4 py-4 font-mono">{formatPrice(row.price)}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-mono">{formatNumber(row.score, 2)}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-mono">{formatNumber(row.rvol, 2)}</td>
                        <td className="whitespace-nowrap px-4 py-4">{valueOrDash(row.timeframe)}</td>
                        <td className="whitespace-nowrap px-4 py-4">{valueOrDash(row.type)}</td>
                        <td className="px-4 py-4">{valueOrDash(row.category)}</td>
                        <td className="whitespace-nowrap px-4 py-4">{valueOrDash(row.exchange)}</td>
                        <td className="whitespace-nowrap px-4 py-4">{valueOrDash(row.source)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {filteredRows.map((row, index) => (
                  <article
                    key={row.id ?? `${row.symbol}-${row.created_at}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-lg font-black text-slate-950 dark:text-white">{valueOrDash(row.symbol)}</div>
                        <div className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">{valueOrDash(row.name)}</div>
                      </div>
                      <SignalBadge signal={row.signal} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <Field label="Created time" value={formatTime(row.created_at)} />
                      <Field label="Price" value={<span className="font-mono">{formatPrice(row.price)}</span>} />
                      <Field label="Score" value={<span className="font-mono">{formatNumber(row.score, 2)}</span>} />
                      <Field label="RVOL" value={<span className="font-mono">{formatNumber(row.rvol, 2)}</span>} />
                      <Field label="Timeframe" value={valueOrDash(row.timeframe)} />
                      <Field label="Type" value={valueOrDash(row.type)} />
                      <Field label="Category" value={valueOrDash(row.category)} />
                      <Field label="Exchange" value={valueOrDash(row.exchange)} />
                      <Field label="Source" value={valueOrDash(row.source)} />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
