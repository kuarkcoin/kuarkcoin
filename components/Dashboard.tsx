"use client";

import { useMemo } from "react";
import { symbolToPlain } from "@/constants/terminal";

export default function Dashboard({ signals, topBuy, topSell }: any) {
  // 1. Piyasa Duyarlılığı (Genel Puan)
  const marketSentiment = useMemo(() => {
    if (!signals.length) return 50;
    const buys = signals.filter((s: any) => s.signal === "BUY").length;
    return Math.round((buys / signals.length) * 100);
  }, [signals]);

  return (
    <div className="p-6 space-y-6 bg-[#0d1117] min-h-screen">
      {/* Üst Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#161b22] p-5 rounded-2xl border border-gray-800 shadow-xl">
          <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Genel Market Trendi</div>
          <div className="flex items-end gap-3 mt-2">
            <div className="text-4xl font-black text-blue-500">%{marketSentiment}</div>
            <div className="text-sm text-gray-400 mb-1">Boğa Ağırlığı</div>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-1000" 
              style={{ width: `${marketSentiment}%` }}
            />
          </div>
        </div>

        <div className="bg-[#161b22] p-5 rounded-2xl border border-gray-800">
          <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">En Güçlü Alım (AI)</div>
          <div className="mt-2 text-xl font-bold text-green-400">
            {topBuy[0]?.symbol ? symbolToPlain(topBuy[0].symbol) : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-1">Skor: {topBuy[0]?.score ?? 0} / 30</div>
        </div>

        <div className="bg-[#161b22] p-5 rounded-2xl border border-gray-800">
          <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Dikkat: Satış Baskısı</div>
          <div className="mt-2 text-xl font-bold text-red-400">
            {topSell[0]?.symbol ? symbolToPlain(topSell[0].symbol) : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-1">Skor: {topSell[0]?.score ?? 0} / 30</div>
        </div>
      </div>

      {/* Isı Haritası (Heatmap) Taslağı */}
      <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800">
        <h3 className="text-sm font-bold text-gray-300 mb-4">PİYASA ISI HARİTASI (Sinyal Gücü)</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {signals.slice(0, 24).map((s: any, i: number) => (
            <div 
              key={i}
              className={`aspect-square flex items-center justify-center rounded-lg text-[10px] font-bold transition-transform hover:scale-110 cursor-pointer ${
                s.signal === 'BUY' ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'bg-red-900/50 text-red-300 border border-red-700/50'
              }`}
              title={`${s.symbol}: ${s.score}`}
            >
              {symbolToPlain(s.symbol)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
