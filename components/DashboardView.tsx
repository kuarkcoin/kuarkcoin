"use client";

import React, { useMemo } from "react";
import { symbolToPlain } from "@/constants/terminal";

interface DashboardProps {
  signals: any[];
  topBuy: any[];
  topSell: any[];
  onSelectSymbol: (symbol: string) => void;
  onGoTerminal?: () => void; // opsiyonel
}

// Eğer plain gelirse prefix ekle (kuark terminal standardı)
function normalizeSymbol(sym: string) {
  const s = String(sym || "").trim();
  if (!s) return "NASDAQ:AAPL";
  if (s.includes(":")) return s;

  // plain sembol geldiyse basit tahmin:
  // BTC/ETH gibi kriptoları yakalamak için istersen burada liste kontrolü yaparsın.
  return `NASDAQ:${s}`;
}

export default function DashboardView({
  signals,
  topBuy,
  topSell,
  onSelectSymbol,
}: DashboardProps) {
  const sentimentScore = useMemo(() => {
    if (!signals?.length) return 50;
    const buys = signals.filter((s: any) => String(s.signal).toUpperCase() === "BUY").length;
    return Math.round((buys / signals.length) * 100);
  }, [signals]);

  const topBuy0 = topBuy?.[0];
  const topSell0 = topSell?.[0];

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117] p-4 md:p-8 custom-scrollbar">
      {/* Üst Satır */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 1. Piyasa Pusulası */}
        <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            Market Duyarlılığı
          </div>
          <div className="text-4xl font-black text-blue-500 mb-2">%{sentimentScore}</div>
          <div className="text-sm text-gray-400">Boğa İştahı</div>
          <div className="mt-4 h-2 w-full bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-1000"
              style={{ width: `${sentimentScore}%` }}
            />
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
            {topBuy0?.symbol ? symbolToPlain(topBuy0.symbol) : "Taranıyor..."}
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
        </div>

        {/* 3. Risk Uyarısı */}
        <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl">
          <div className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4">
            Dikkat: Satış Baskısı (Top SELL)
          </div>
          <div className="text-2xl font-black text-white">
            {topSell0?.symbol ? symbolToPlain(topSell0.symbol) : "Taranıyor..."}
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

      {/* Isı Haritası */}
      <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl mb-8">
        <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest">
          Piyasa Isı Haritası (Sinyal Dağılımı)
        </h3>

        {(!signals || signals.length === 0) ? (
          <div className="text-sm text-gray-500">Henüz veri yok.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-12 gap-3">
            {signals.slice(0, 48).map((s: any, i: number) => {
              const sig = String(s?.signal || "").toUpperCase();
              const isBuy = sig === "BUY";
              const sym = normalizeSymbol(String(s?.symbol || ""));

              return (
                <button
                  key={i}
                  onClick={() => onSelectSymbol(sym)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 border ${
                    isBuy
                      ? "bg-green-900/30 border-green-800 text-green-300"
                      : "bg-red-900/30 border-red-800 text-red-300"
                  }`}
                  title={`${sym}: ${s?.score ?? "—"}`}
                >
                  <span className="text-[10px] font-bold">{symbolToPlain(sym)}</span>
                  <span className="text-[8px] opacity-60">{s?.score ?? "—"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}