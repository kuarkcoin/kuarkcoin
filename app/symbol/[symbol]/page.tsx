import { headers } from "next/headers";
import { findTrackedSymbol, normalizeSymbol } from "@/data/tracked-symbols";

type PageProps = {
  params: {
    symbol: string;
  };
};

type SignalRow = {
  id?: number | string;
  created_at?: string | null;
  symbol?: string | null;
  signal?: string | null;
  price?: number | null;
  score?: number | null;
  reasons?: string | null;
  outcome?: "WIN" | "LOSS" | null;
};

type SymbolProfile = {
  symbol: string;
  name: string;
  type: string;
  category: string;
  exchange: string;
  active?: boolean;
};

function getApiBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function normalizeSignal(signal: string | null | undefined) {
  return String(signal ?? "").trim().toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 6,
  }).format(value);
}

function parseReasons(reasons: string | null | undefined) {
  return String(reasons ?? "")
    .split(/[,;|\n]+/g)
    .map((reason) => reason.trim())
    .filter(Boolean)
    .slice(0, 6);
}

async function getRecentSignals(normalizedSymbol: string): Promise<SignalRow[]> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/signals`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) return [];

    const json = await response.json();
    const rows = Array.isArray(json?.data) ? (json.data as SignalRow[]) : [];

    return rows
      .filter((row) => normalizeSymbol(String(row.symbol ?? "")) === normalizedSymbol)
      .slice(0, 24);
  } catch (error) {
    console.error("Symbol signals fetch failed:", error);
    return [];
  }
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <dt className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-2 break-words text-lg font-semibold text-slate-950 dark:text-slate-50">{value}</dd>
    </div>
  );
}

function SignalCard({ signal }: { signal: SignalRow }) {
  const side = normalizeSignal(signal.signal);
  const isBuy = side === "BUY";
  const isSell = side === "SELL";
  const reasons = parseReasons(signal.reasons);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                isBuy
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : isSell
                    ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {side || "UNKNOWN"}
            </span>
            {signal.outcome ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {signal.outcome}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-950 dark:text-slate-50">{signal.symbol ?? "—"}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(signal.created_at)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-right sm:min-w-48">
          <div>
            <dt className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Price</dt>
            <dd className="font-semibold text-slate-950 dark:text-slate-50">{formatNumber(signal.price)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Score</dt>
            <dd className="font-semibold text-slate-950 dark:text-slate-50">{formatNumber(signal.score)}</dd>
          </div>
        </dl>
      </div>

      {reasons.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <span
              key={reason}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              {reason}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default async function SymbolPage({ params }: PageProps) {
  const normalizedSymbol = normalizeSymbol(decodeURIComponent(params.symbol));
  const trackedSymbol = findTrackedSymbol(normalizedSymbol);
  const profile: SymbolProfile = trackedSymbol ?? {
    symbol: normalizedSymbol,
    name: normalizedSymbol,
    type: "unknown",
    category: "Untracked",
    exchange: "Unknown",
  };
  const signals = await getRecentSignals(normalizedSymbol);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-[#070b12] dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 text-white sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Symbol Detail</p>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{profile.symbol}</h1>
                <p className="mt-3 max-w-2xl text-base text-slate-300 sm:text-lg">{profile.name}</p>
              </div>
              {trackedSymbol ? (
                <span
                  className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${
                    profile.active === false
                      ? "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/30"
                      : "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30"
                  }`}
                >
                  {profile.active === false ? "Inactive" : "Active"}
                </span>
              ) : null}
            </div>
          </div>

          <dl className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-6">
            <DetailCard label="Symbol" value={profile.symbol} />
            <DetailCard label="Name" value={profile.name} />
            <DetailCard label="Type" value={profile.type} />
            <DetailCard label="Category" value={profile.category} />
            <DetailCard label="Exchange" value={profile.exchange} />
            {trackedSymbol ? <DetailCard label="Active Status" value={profile.active === false ? "Inactive" : "Active"} /> : null}
          </dl>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Recent Signals</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-50">{normalizedSymbol}</h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{signals.length} matching signal{signals.length === 1 ? "" : "s"}</p>
          </div>

          {signals.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {signals.map((signal, index) => (
                <SignalCard key={signal.id ?? `${signal.created_at}-${index}`} signal={signal} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">No recent signals found</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                /api/signals did not return any recent rows for {normalizedSymbol}.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
