"use client";

import React, { useMemo, useCallback } from "react";
import { ASSETS, symbolToPlain } from "@/constants/terminal";

type SignalRowLike = {
  id?: number;
  symbol: string; // "NASDAQ:AAPL" veya "AAPL"
  signal?: string; // BUY/SELL
  score?: number | null;
  created_at?: string;
  price?: number | null;
};

interface DashboardProps {
  signals: SignalRowLike[];
  topBuy: SignalRowLike[];
  topSell: SignalRowLike[];
  onSelectSymbol: (symbol: string) => void; // TerminalPage handleSelectSymbol
  onGoTerminal?: () => void; // opsiyonel
}

function normalizeSymbol(sym: string) {
  const s = String(sym || "").trim();
  if (!s) return "NASDAQ:AAPL";
  if (s.includes(":")) return s;

  // Basit tahmin: plain geldiyse NASDAQ varsay.
  // (İstersen burada crypto/bist listesiyle daha akıllı yaparız)
  return `NASDAQ:${s}`;
}

function upper(x: any) {
  return String(x ?? "").toUpperCase();
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// score 0..40 arası kabul → 0.15..1 yoğunluk
function scoreIntensity(score?: number | null) {
  const s = Number(score ?? 0);
  return clamp(s / 40, 0.15, 1);
}

export default function DashboardView({
  signals,
  topBuy,
  topSell,
  onSelectSymbol,
  onGoTerminal,
}: DashboardProps) {
  const sentimentScore = useMemo(() => {
    if (!signals?.length) return 50;

    // score ağırlıklı BUY yüzdesi
    let buyW = 0;
    let totW = 0;
    for (const s of signals) {
      const w = Math.max(1, Number(s.score ?? 0));
      totW += w;
      if (upper(s.signal) === "BUY") buyW += w;
    }
    return clamp(Math.round((buyW / (totW || 1)) * 100), 0, 100);
  }, [signals]);

  const stats = useMemo(() => {
    const total = signals?.length ?? 0;
    const buys = (signals ?? []).filter((s) => upper(s.signal) === "BUY").length;
    const sells = (signals ?? []).filter((s) => upper(s.signal) === "SELL").length;
    const avgScore = total
      ? Math.round((signals ?? []).reduce((a, b) => a + Number(b.score ?? 0), 0) / total)
      : 0;
    return { total, buys, sells, avgScore };
  }, [signals]);

  const topBuy0 = topBuy?.[0];
  const topSell0 = topSell?.[0];

  const goSymbol = useCallback(
    (sym: string) => {
      onSelectSymbol(normalizeSymbol(sym));
      onGoTerminal?.();
    },
    [onSelectSymbol, onGoTerminal]
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117] p-4 md:p-8 custom-scrollbar">
      {/* ÜST KARTLAR */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Market Duyarlılığı */}
        <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            Market Duyarlılığı
          </div>

          <div className="text-4xl font-black text-blue-500 mb-2">%{sentimentScore}</div>
          <div className="text-sm text-gray-400">Boğa İştahı (score ağırlıklı)</div>

          <div className="mt-4 h-2 w-full bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-700"
              style={{ width: `${sentimentScore}%` }}
            />
          </div>

          <div className="mt-4 text-[11px] text-gray-500">
            Toplam <b className="text-gray-300">{stats.total}</b> • BUY{" "}
            <b className="text-green-300">{stats.buys}</b> • SELL{" "}
            <b className="text-red-300">{stats.sells}</b> • Avg{" "}
            <b className="text-gray-300">{stats.avgScore}</b>
          </div>

          <div className="absolute -right-4 -bottom-4 opacity-10">
            <svg width="120" height="120" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
        </div>

        {/* Top BUY */}
        <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl">
          <div className="text-xs font-bold text-green-500 uppercase tracking-widest mb-4">
            Günün Yıldızı (Top BUY)
          </div>

          <div className="text-2xl font-black text-white">
            {topBuy0?.symbol ? symbolToPlain(topBuy0.symbol) : "Taranıyor..."}
          </div>

          <div className="text-sm text-gray-400 mt-2">Teknik Skor: {topBuy0?.score ?? 0}</div>

          <button
            onClick={() => topBuy0?.symbol && goSymbol(topBuy0.symbol)}
            disabled={!topBuy0?.symbol}
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all border ${
              topBuy0?.symbol
                ? "bg-green-900/20 hover:bg-green-900/40 border-green-800 text-green-400"
                : "bg-gray-900/30 border-gray-800 text-gray-600"
            }`}
          >
            TERMINALDE AÇ →
          </button>
        </div>

        {/* Top SELL */}
        <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl">
          <div className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4">
            Dikkat: Satış Baskısı (Top SELL)
          </div>

          <div className="text-2xl font-black text-white">
            {topSell0?.symbol ? symbolToPlain(topSell0.symbol) : "Taranıyor..."}
          </div>

          <div className="text-sm text-gray-400 mt-2">Teknik Skor: {topSell0?.score ?? 0}</div>

          <button
            onClick={() => topSell0?.symbol && goSymbol(topSell0.symbol)}
            disabled={!topSell0?.symbol}
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all border ${
              topSell0?.symbol
                ? "bg-red-900/20 hover:bg-red-900/40 border-red-800 text-red-400"
                : "bg-gray-900/30 border-gray-800 text-gray-600"
            }`}
          >
            TERMINALDE AÇ →
          </button>
        </div>

        {/* Mini bilgi kartı */}
        <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            Sistem Durumu
          </div>

          <div className="text-sm text-gray-300">
            Liste:{" "}
            <span className="font-mono text-gray-200">
              NASDAQ {ASSETS.NASDAQ.length} • ETF {ASSETS.ETF.length} • CRYPTO {ASSETS.CRYPTO.length} •{" "}
              BIST {((ASSETS as any).BIST?.length ?? 0) as number}
            </span>
          </div>

          <div className="mt-3 text-[11px] text-gray-500">
            Dashboard’dan sembole tıkla → Terminal grafiği otomatik açılır.
          </div>
        </div>
      </div>

      {/* ISI HARİTASI */}
      <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl mb-8">
        <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest">
          Piyasa Isı Haritası (Skor Yoğunluğu)
        </h3>

        {!signals?.length ? (
          <div className="text-sm text-gray-500">Henüz veri yok.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-12 gap-3">
            {signals.slice(0, 60).map((s, i) => {
              const sig = upper(s?.signal);
              const isBuy = sig === "BUY";
              const sym = normalizeSymbol(String(s?.symbol || ""));
              const intensity = scoreIntensity(s?.score);

              // Tailwind ile score bazlı renk tonu yapmak zor; inline rgba ile net çözüm
              const bg = isBuy
                ? `rgba(16, 185, 129, ${0.12 + 0.55 * intensity})`
                : `rgba(239, 68, 68, ${0.12 + 0.55 * intensity})`;
              const border = isBuy ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)";
              const color = isBuy ? "rgba(167,243,208,1)" : "rgba(254,202,202,1)";

              return (
                <button
                  key={i}
                  onClick={() => goSymbol(sym)}
                  className="aspect-square flex flex-col items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 border"
                  style={{ background: bg, borderColor: border, color }}
                  title={`${sym} • ${sig} • score:${s?.score ?? "—"}`}
                >
                  <span className="text-[10px] font-bold truncate max-w-[90%]">
                    {symbolToPlain(sym)}
                  </span>
                  <span className="text-[8px] opacity-70">{s?.score ?? "—"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}