"use client";

import React, { useMemo, useState } from "react";
import { ASSETS, symbolToPlain, timeAgo } from "@/constants/terminal";

const BIST_SET = new Set<string>(((ASSETS as any).BIST ?? []).map((x: string) => String(x).toUpperCase()));
const CRYPTO_SET = new Set<string>(((ASSETS as any).CRYPTO ?? []).map((x: string) => String(x).toUpperCase()));
const ETF_SET = new Set<string>(((ASSETS as any).ETF ?? []).map((x: string) => String(x).toUpperCase()));

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
  if (s.includes(":")) return s.toUpperCase();

  const plain = s.toUpperCase().replace(/\.IS$/, "");

  if (BIST_SET.has(plain) || s.toUpperCase().endsWith(".IS")) return `BIST:${plain}`;
  if (CRYPTO_SET.has(plain)) return `BINANCE:${plain}`;
  if (ETF_SET.has(plain)) return `AMEX:${plain}`;

  return `NASDAQ:${plain}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// Heatmap intensity (score → opacity/contrast) — INLINE STYLE (Tailwind purge sorunu yok)
function heatStyle(isBuy: boolean, intensity01: number): React.CSSProperties {
  const k = clamp(intensity01, 0, 1);
  const alpha = 0.25 + 0.6 * k; // 0.25 → 0.85

  if (isBuy) {
    return {
      backgroundColor: `rgba(16,185,129,${alpha})`,
      borderColor: "rgba(16,185,129,0.35)",
      color: "rgba(167,243,208,1)",
    };
  }

  return {
    backgroundColor: `rgba(239,68,68,${alpha})`,
    borderColor: "rgba(239,68,68,0.35)",
    color: "rgba(254,202,202,1)",
  };
}

// Basit hover-card (dependency yok)
function HoverCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      {children}
      <div className="pointer-events-none absolute z-50 hidden group-hover:block -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-72">
        <div className="rounded-xl border border-gray-800 bg-[#0b0f14] p-3 shadow-2xl">
          <div className="text-xs text-gray-200 leading-snug">{title}</div>
        </div>
      </div>
    </div>
  );
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

  const topBuy0 = useMemo(
    () => [...(topBuy ?? [])].sort((a, b) => (Number(b?.score ?? -999999) - Number(a?.score ?? -999999)))[0],
    [topBuy]
  );
  const topSell0 = useMemo(
    () => [...(topSell ?? [])].sort((a, b) => (Number(b?.score ?? -999999) - Number(a?.score ?? -999999)))[0],
    [topSell]
  );

  // ------------------------
  // Heatmap controls
  // ------------------------
  const [heatFilter, setHeatFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [minScore, setMinScore] = useState<number>(0);
  const [heatLimit, setHeatLimit] = useState<number>(48);

  const scoreMax = useMemo(() => {
    let mx = 0;
    for (const s of signals ?? []) {
      mx = Math.max(mx, Number(s?.score ?? 0));
    }
    return mx || 30;
  }, [signals]);

  const heatRows = useMemo(() => {
    const list = (signals ?? [])
      .map((s) => {
        const symbol = normalizeSymbol(String(s?.symbol || ""));
        return {
          symbol,
          plain: symbolToPlain(symbol),
          signal: String(s?.signal || "").toUpperCase(),
          score: Number(s?.score ?? 0),
          created_at: s?.created_at ?? null,
          reasons: s?.reasons ?? null,
        };
      })
      // en güçlüleri öne al
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const filtered = list.filter((x) => {
      if (heatFilter !== "ALL" && x.signal !== heatFilter) return false;
      if ((x.score ?? 0) < minScore) return false;
      return true;
    });

    return filtered.slice(0, heatLimit);
  }, [signals, heatFilter, minScore, heatLimit]);

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

      {/* Isı Haritası */}
      <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Piyasa Isı Haritası (Sinyal Gücü)
          </h3>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 border border-gray-800 rounded-xl p-1 bg-[#0d1117]">
              {(["ALL", "BUY", "SELL"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setHeatFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    heatFilter === k
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border border-gray-800 rounded-xl px-3 py-2 bg-[#0d1117]">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Min Score</div>
              <input
                type="range"
                min={0}
                max={Math.max(10, scoreMax)}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              />
              <div className="text-xs font-mono text-gray-300 w-8 text-right">{minScore}</div>
            </div>

            <button
              onClick={() => setHeatLimit((p) => Math.min(p + 48, 240))}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-800 bg-[#0d1117] hover:bg-gray-800/40 text-gray-200 transition-colors"
            >
              Daha fazla göster
            </button>

            <button
              onClick={() => {
                setHeatLimit(48);
                setHeatFilter("ALL");
                setMinScore(0);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-800 bg-[#0d1117] hover:bg-gray-800/40 text-gray-400 transition-colors"
            >
              Sıfırla
            </button>
          </div>
        </div>

        {(!signals || signals.length === 0) ? (
          <div className="text-sm text-gray-500">Henüz veri yok.</div>
        ) : heatRows.length === 0 ? (
          <div className="text-sm text-gray-500">
            Filtrelere göre sonuç yok. (MinScore/BUY-SELL filtresini düşür)
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-12 gap-3">
            {heatRows.map((s, i) => {
              const isBuy = s.signal === "BUY";
              const intensity01 = clamp((Number(s.score ?? 0) || 0) / Math.max(1, scoreMax), 0, 1);
              const style = heatStyle(isBuy, intensity01);

              const title = (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold">{symbolToPlain(s.symbol)}</div>
                    <div className="text-[10px] text-gray-500">{s.created_at ? timeAgo(s.created_at) : ""}</div>
                  </div>
                  <div className="text-[11px] text-gray-300">
                    Signal:{" "}
                    <b className={isBuy ? "text-green-300" : "text-red-300"}>
                      {s.signal || "—"}
                    </b>{" "}
                    • Score: <b>{s.score ?? "—"}</b>
                  </div>
                  <div className="text-[10px] text-gray-400 line-clamp-2">
                    {(s.reasons ?? "").slice(0, 180) || "—"}
                  </div>
                </div>
              );

              return (
                <HoverCard key={`${s.symbol}-${i}`} title={title}>
                  <button
                    onClick={() => onSelectSymbol(s.symbol)}
                    style={style}
                    className="aspect-square flex flex-col items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 border"
                    aria-label={`Open ${s.symbol}`}
                  >
                    <span className="text-[10px] font-bold">{symbolToPlain(s.symbol)}</span>
                    <span className="text-[8px] opacity-70">{s.score ?? "—"}</span>
                  </button>
                </HoverCard>
              );
            })}
          </div>
        )}
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
