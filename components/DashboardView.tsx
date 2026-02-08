"use client";

import React, { useMemo } from "react";
import { symbolToPlain } from "@/constants/terminal";

type SignalTone = "BUY" | "SELL" | string;

export type DashboardSignalRow = {
  symbol: string;
  signal?: SignalTone | null;
  score?: number | null;
  created_at?: string | null;
  datetime?: number | null;
  reasons?: string | null;
};

export type DashboardProps = {
  signals: DashboardSignalRow[];
  topBuy: DashboardSignalRow[];
  topSell: DashboardSignalRow[];
  onSelectSymbol: (symbol: string) => void;
  onGoTerminal?: () => void;

  // UX states
  isLoading?: boolean;
  error?: string | null;
};

// Eğer plain gelirse prefix ekle (kuark terminal standardı)
function normalizeSymbol(sym: string) {
  const s = String(sym || "").trim();
  if (!s) return "NASDAQ:AAPL";
  if (s.includes(":")) return s;
  return `NASDAQ:${s}`;
}

// 7 günlük sentiment sparkline
function Sparkline({ points }: { points: number[] }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const norm = points.map((p) => (max === min ? 0.5 : (p - min) / (max - min)));

  const d = norm
    .map((v, i) => {
      const x = (i * 100) / (norm.length - 1);
      const y = 30 - v * 28;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 30" className="w-24 h-7 text-gray-200/80">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function DashboardView({
  signals,
  topBuy,
  topSell,
  onSelectSymbol,
  onGoTerminal,
  isLoading = false,
  error = null,
}: DashboardProps) {
  // ------------------------
  // Loading / Error / Empty
  // ------------------------
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d1117] p-8">
        <div className="text-gray-400 animate-pulse">Piyasa taranıyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d1117] p-8">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const hasAny = (signals?.length ?? 0) + (topBuy?.length ?? 0) + (topSell?.length ?? 0) > 0;
  if (!hasAny) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d1117] p-8">
        <div className="text-gray-500">Henüz sinyal üretilmedi.</div>
      </div>
    );
  }

  // ------------------------
  // Sentiment + history
  // ------------------------
  const sentimentScore = useMemo(() => {
    if (!signals?.length) return 50;
    const buys = signals.filter((s) => String(s.signal ?? "").toUpperCase() === "BUY").length;
    return Math.round((buys / signals.length) * 100);
  }, [signals]);

  // 7 günlük bull% (created_at varsa)
  const last7 = useMemo(() => {
    if (!signals?.length) return Array.from({ length: 7 }, () => 50);

    const byDay = new Map<string, { total: number; buys: number }>();

    for (const r of signals) {
      const dt = r.created_at
        ? new Date(r.created_at)
        : typeof r.datetime === "number"
        ? new Date(r.datetime * 1000)
        : new Date();

      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;

      const prev = byDay.get(key) ?? { total: 0, buys: 0 };
      prev.total += 1;
      if (String(r.signal ?? "").toUpperCase() === "BUY") prev.buys += 1;
      byDay.set(key, prev);
    }

    const out: number[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${dd}`;

      const v = byDay.get(key);
      if (!v || v.total === 0) out.push(50);
      else out.push(Math.round((v.buys / v.total) * 100));
    }
    return out;
  }, [signals]);

  const topBuy0 = topBuy?.[0];
  const topSell0 = topSell?.[0];

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117] p-4 md:p-8 custom-scrollbar">
      {/* Üst Satır */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 1. Piyasa Pusulası */}
        <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                Market Duyarlılığı
              </div>
              <div className="text-4xl font-black text-blue-500 mb-2">%{sentimentScore}</div>
              <div className="text-sm text-gray-400">Boğa İştahı</div>
            </div>

            <div className="flex flex-col items-end">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">7 Gün</div>
              <Sparkline points={last7} />
            </div>
          </div>

          <div className="mt-4 h-2 w-full bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${sentimentScore}%` }} />
          </div>

          <div className="absolute -right-4 -bottom-4 opacity-10">
            <svg width="120" height="120" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
        </div>

        {/* 2. Top Pick */}
        <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl">
          <div className="text-xs font-bold text-green-500 uppercase tracking-widest mb-4">
            Günün Yıldızı (Top BUY)
          </div>
          <div className="text-2xl font-black text-white">
            {topBuy0?.symbol ? symbolToPlain(normalizeSymbol(topBuy0.symbol)) : "Taranıyor..."}
          </div>
          <div className="text-sm text-gray-400 mt-2">Teknik Skor: {topBuy0?.score ?? 0}</div>

          <button
            onClick={() => topBuy0?.symbol && onSelectSymbol(normalizeSymbol(topBuy0.symbol))}
            disabled={!topBuy0?.symbol}
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all border ${
              topBuy0?.symbol
                ? "bg-green-900/20 hover:bg-green-900/40 border-green-800 text-green-400"
                : "bg-gray-900/30 border-gray-800 text-gray-600"
            }`}
          >
            DETAYA GİT →
          </button>

          {onGoTerminal && (
            <button
              onClick={onGoTerminal}
              className="mt-2 w-full py-2 rounded-xl text-xs font-bold transition-all border border-gray-700 text-gray-200 hover:bg-gray-800/40"
            >
              Terminale geç →
            </button>
          )}
        </div>

        {/* 3. Risk Uyarısı */}
        <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl">
          <div className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4">
            Dikkat: Satış Baskısı (Top SELL)
          </div>
          <div className="text-2xl font-black text-white">
            {topSell0?.symbol ? symbolToPlain(normalizeSymbol(topSell0.symbol)) : "Taranıyor..."}
          </div>
          <div className="text-sm text-gray-400 mt-2">Teknik Skor: {topSell0?.score ?? 0}</div>

          <button
            onClick={() => topSell0?.symbol && onSelectSymbol(normalizeSymbol(topSell0.symbol))}
            disabled={!topSell0?.symbol}
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all border ${
              topSell0?.symbol
                ? "bg-red-900/20 hover:bg-red-900/40 border-red-800 text-red-400"
                : "bg-gray-900/30 border-gray-800 text-gray-600"
            }`}
          >
            ANALİZ ET →
          </button>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0d1117; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #21262d; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #30363d; }
      `}</style>
    </div>
  );
}
