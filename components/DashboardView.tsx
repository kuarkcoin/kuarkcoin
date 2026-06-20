"use client";

import React, { useEffect, useMemo, useState } from "react";
import { symbolToPlain, timeAgo } from "@/constants/terminal";
import { mapSignalToHeatmap } from "@/lib/map-signal-to-heatmap";

type SignalTone = "BUY" | "SELL" | string;

export type DashboardSignalRow = {
  symbol: string;
  signal?: SignalTone | null;
  score?: number | string | null;
  price?: number | string | null;
  created_at?: string | null;
  createdAt?: string | null;
  datetime?: number | string | null;
  timestamp?: number | string | null;
  timeframe?: string | null;
  exchange?: string | null;
  source?: string | null;
  reasons?: string | string[] | null;
  indicators?: Record<string, unknown> | null;
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
  active,
  title,
  children,
}: {
  active: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {active && (
        <div className="pointer-events-none absolute z-50 -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-72">
          <div className="rounded-xl border border-gray-800 bg-[#0b0f14] p-3 shadow-2xl">
            <div className="text-xs text-gray-200 leading-snug">{title}</div>
          </div>
        </div>
      )}
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
  const normalizedSignals = useMemo(() => (signals ?? []).map(mapSignalToHeatmap), [signals]);

  const [activeHeatKey, setActiveHeatKey] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // ------------------------
  // Sentiment + history
  // ------------------------
  const sentimentScore = useMemo(() => {
    if (!normalizedSignals.length) return 50;
    const buys = normalizedSignals.filter((s) => s.signal === "BUY").length;
    return Math.round((buys / normalizedSignals.length) * 100);
  }, [normalizedSignals]);

  // 7 günlük bull% (created_at varsa)
  const last7 = useMemo(() => {
    if (!normalizedSignals.length) return Array.from({ length: 7 }, () => 50);

    const byDay = new Map<string, { total: number; buys: number }>();

    for (const r of normalizedSignals) {
      const dt = r.createdAt ? new Date(r.createdAt) : new Date();

      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;

      const prev = byDay.get(key) ?? { total: 0, buys: 0 };
      prev.total += 1;
      if (r.signal === "BUY") prev.buys += 1;
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
  }, [normalizedSignals]);

  void nowTick;

  const topBuy0 = topBuy?.[0];
  const topSell0 = topSell?.[0];

  // ------------------------
  // Heatmap controls
  // ------------------------
  const [heatFilter, setHeatFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [minScore, setMinScore] = useState<number>(0);
  const [heatLimit, setHeatLimit] = useState<number>(48);

  const scoreMax = useMemo(() => {
    let mx = 0;
    for (const s of normalizedSignals) {
      mx = Math.max(mx, s.score);
    }
    return mx || 30;
  }, [normalizedSignals]);

  const heatRows = useMemo(() => {
    const list = [...normalizedSignals].sort((a, b) => b.score - a.score);

    const filtered = list.filter((x) => {
      if (heatFilter !== "ALL" && x.signal !== heatFilter) return false;
      if (x.score < minScore) return false;
      return true;
    });

    return filtered.slice(0, heatLimit);
  }, [normalizedSignals, heatFilter, minScore, heatLimit]);


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

  const hasAny = normalizedSignals.length + (topBuy?.length ?? 0) + (topSell?.length ?? 0) > 0;
  if (!hasAny) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d1117] p-8">
        <div className="text-gray-500">Henüz sinyal üretilmedi.</div>
      </div>
    );
  }

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

        {normalizedSignals.length === 0 ? (
          <div className="text-sm text-gray-500">Henüz veri yok.</div>
        ) : heatRows.length === 0 ? (
          <div className="text-sm text-gray-500">
            Filtrelere göre sonuç yok. (MinScore/BUY-SELL filtresini düşür)
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-12 gap-3">
            {heatRows.map((s, i) => {
              const heatKey = `${s.symbol}-${s.createdAt ?? i}`;
              const isActive = activeHeatKey === heatKey;
              const isBuy = s.signal === "BUY";
              const intensity01 = clamp(s.score / Math.max(1, scoreMax), 0, 1);
              const style = heatStyle(isBuy, intensity01);

              const title = isActive ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold">{s.plain}</div>
                    <div className="text-[10px] text-gray-500">{s.createdAt ? timeAgo(s.createdAt) : ""}</div>
                  </div>
                  <div className="text-[11px] text-gray-300">
                    Signal:{" "}
                    <b className={isBuy ? "text-green-300" : "text-red-300"}>
                      {s.signal || "—"}
                    </b>{" "}
                    • Score: <b>{s.score}</b>
                  </div>
                  <div className="text-[10px] text-gray-400 line-clamp-2">
                    {s.reasons.join(", ").slice(0, 180) || "—"}
                  </div>
                </div>
              ) : null;

              return (
                <HoverCard key={heatKey} active={isActive} title={title}>
                  <button
                    onClick={() => onSelectSymbol(s.symbol)}
                    onMouseEnter={() => setActiveHeatKey(heatKey)}
                    onMouseLeave={() => setActiveHeatKey((current) => (current === heatKey ? null : current))}
                    onFocus={() => setActiveHeatKey(heatKey)}
                    onBlur={() => setActiveHeatKey((current) => (current === heatKey ? null : current))}
                    style={style}
                    className="aspect-square flex flex-col items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 border"
                    aria-label={`Open ${s.symbol}`}
                  >
                    <span className="text-[10px] font-bold">{s.plain}</span>
                    <span className="text-[8px] opacity-70">{s.score}</span>
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