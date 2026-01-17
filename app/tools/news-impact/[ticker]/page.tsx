'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Item = {
  headline: string;
  time: number;
  url?: string;
  ret1d?: number | null;
  ret5d?: number | null;
  strength?: number | null;
};

export default function TickerImpactPage({ params }: { params: { ticker: string } }) {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const [loading, setLoading] = useState(true);
  const [monthChange, setMonthChange] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/news-impact?ticker=${encodeURIComponent(ticker)}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setMonthChange(data?.monthChange ?? null);
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Unknown error');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ticker]);

  const fmtPct = (x?: number | null) =>
    typeof x === 'number' ? `${(x * 100).toFixed(2)}%` : '—';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold text-slate-500">News Impact · Beta</div>
            <h1 className="text-3xl font-black text-slate-900">{ticker}</h1>
            <div className="text-sm text-slate-600 mt-1">
              1M Change: <span className="font-bold text-slate-900">{fmtPct(monthChange)}</span>
            </div>
          </div>
          <Link href="/tools/news-impact" className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100">
            ← New ticker
          </Link>
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="animate-pulse text-slate-600 font-bold">Loading news & price data…</div>
          </div>
        )}

        {error && (
          <div className="bg-white border border-red-200 rounded-3xl p-6 shadow-sm text-red-700 font-bold">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-4">
            {items.map((it, idx) => (
              <a
                key={idx}
                href={it.url || '#'}
                target="_blank"
                className="block bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="text-sm font-black text-slate-900 mb-2">{it.headline}</div>
                <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-600">
                  <span>After 1D: <span className="text-slate-900">{fmtPct(it.ret1d)}</span></span>
                  <span>After 5D: <span className="text-slate-900">{fmtPct(it.ret5d)}</span></span>
                  <span>Strength: <span className="text-slate-900">{it.strength ?? '—'}/100</span></span>
                </div>
              </a>
            ))}
            {items.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-600 font-bold">
                No items found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
