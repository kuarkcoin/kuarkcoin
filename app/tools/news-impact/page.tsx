'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewsImpactTool() {
  const router = useRouter();
  const [ticker, setTicker] = useState('AAPL');

  const go = () => {
    const t = (ticker || '').trim().toUpperCase();
    if (!t) return;
    router.push(`/tools/news-impact/${encodeURIComponent(t)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 mb-4">
            📈 News Impact · Beta
          </div>

          <h1 className="text-3xl font-black text-slate-900 mb-2">Stock News Impact Analyzer</h1>
          <p className="text-slate-600 mb-6">
            Enter a ticker and see how price reacted after each news item (1D/5D) + a simple strength score.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g., AAPL"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={go}
              className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition"
            >
              Analyze
            </button>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Note: This tool is separate from English tests (Beta).
          </div>
        </div>
      </div>
    </div>
  );
}
