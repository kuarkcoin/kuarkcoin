"use client";

import { useMemo, useState } from "react";
import { TRACKED_SYMBOLS, type TrackedSymbolType } from "@/data/tracked-symbols";

type TypeFilter = "all" | TrackedSymbolType;

const typeFilters: { label: string; value: TypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Stocks", value: "stock" },
  { label: "ETFs", value: "etf" },
];

function typeLabel(type: TrackedSymbolType) {
  return type === "etf" ? "ETF" : "Stock";
}

function typeBadgeClass(type: TrackedSymbolType) {
  return type === "etf"
    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-cyan-500/10"
    : "border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-emerald-500/10";
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export default function MarketsPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [exchangeFilter, setExchangeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(TRACKED_SYMBOLS.map((item) => item.category))).sort(),
    [],
  );
  const exchanges = useMemo(
    () => Array.from(new Set(TRACKED_SYMBOLS.map((item) => item.exchange))).sort(),
    [],
  );

  const filteredSymbols = useMemo(() => {
    const query = normalizeText(search);

    return TRACKED_SYMBOLS.filter((item) => {
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesExchange = exchangeFilter === "all" || item.exchange === exchangeFilter;
      const matchesSearch =
        !query ||
        item.symbol.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query);

      return matchesType && matchesCategory && matchesExchange && matchesSearch;
    });
  }, [categoryFilter, exchangeFilter, search, typeFilter]);

  const stockCount = TRACKED_SYMBOLS.filter((item) => item.type === "stock").length;
  const etfCount = TRACKED_SYMBOLS.filter((item) => item.type === "etf").length;
  const activeCount = TRACKED_SYMBOLS.filter((item) => item.active).length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <section className="relative isolate px-4 py-6 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <header className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-cyan-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
                  Market Watchlist
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Tracked Markets
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                  English-first terminal view for the 100 tracked symbols across stocks and ETFs.
                  Filter by instrument type, category, exchange, or search by symbol and name.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-2xl font-semibold text-white">{TRACKED_SYMBOLS.length}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">Symbols</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-2xl font-semibold text-emerald-300">{stockCount}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">Stocks</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-2xl font-semibold text-cyan-300">{etfCount}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">ETFs</div>
                </div>
              </div>
            </div>
          </header>

          <section className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-xl shadow-black/20 backdrop-blur sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Symbol / Name Search
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search AAPL, QQQ, Aselsan..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </label>

              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Category
                </span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Exchange
                </span>
                <select
                  value={exchangeFilter}
                  onChange={(event) => setExchangeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                >
                  <option value="all">All exchanges</option>
                  {exchanges.map((exchange) => (
                    <option key={exchange} value={exchange}>
                      {exchange}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {typeFilters.map((filter) => {
                  const isActive = typeFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setTypeFilter(filter.value)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-cyan-300 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20"
                          : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5">
                  Showing {filteredSymbols.length} / {TRACKED_SYMBOLS.length}
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
                  {activeCount} active
                </span>
              </div>
            </div>
          </section>

          <section aria-label="Tracked symbol list" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSymbols.map((item) => (
              <article
                key={`${item.exchange}-${item.symbol}`}
                className="group min-w-0 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-slate-900"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className="break-words font-mono text-2xl font-semibold tracking-tight text-white">
                        {item.symbol}
                      </h2>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] shadow-lg ${typeBadgeClass(item.type)}`}>
                        {typeLabel(item.type)}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm leading-5 text-slate-300">{item.name}</p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      item.active
                        ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/30"
                        : "bg-slate-700/50 text-slate-400 ring-1 ring-slate-600"
                    }`}
                  >
                    {item.active ? "Active" : "Paused"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 text-sm min-[420px]:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Category</div>
                    <div className="mt-1 break-words text-slate-200">{item.category}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Exchange</div>
                    <div className="mt-1 break-words font-mono text-slate-200">{item.exchange}</div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          {filteredSymbols.length === 0 ? (
            <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-6 text-center text-amber-100">
              No symbols match the current filters. Clear a filter or try a broader search.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
