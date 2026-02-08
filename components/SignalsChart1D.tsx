"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseReasons, REASON_LABEL } from "@/constants/terminal";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type SignalRow = {
  id: number;
  symbol: string;
  side: "BUY" | "SELL";
  tf: string;
  time: number;
  price: number | null;
  reasons: string | null;
};

type MergedSignal = {
  time: number;
  sides: Set<SignalRow["side"]>;
  reasons: Set<string>;
};

type Props = {
  symbol: string;
  days?: number;
};

function normalizeReasonLabels(reasons: string | null) {
  return parseReasons(reasons).map((key) => REASON_LABEL[key] ?? key);
}

function mergeSignals(rows: SignalRow[]) {
  const map = new Map<number, MergedSignal>();
  for (const row of rows) {
    const key = row.time;
    const entry = map.get(key) ?? { time: key, sides: new Set(), reasons: new Set() };
    entry.sides.add(row.side);
    for (const reason of normalizeReasonLabels(row.reasons)) {
      if (reason) entry.reasons.add(reason);
    }
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

async function loadScript(src: string) {
  if (typeof window === "undefined") return;
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing) {
    if (existing.dataset.loaded === "true") return;
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Script load failed")), { once: true });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Script load failed"));
    document.head.appendChild(script);
  });
}

export default function SignalsChart1D({ symbol, days = 120 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mergedSignals = useMemo(() => mergeSignals(signals), [signals]);
  const latestReasons = mergedSignals[mergedSignals.length - 1]?.reasons;
  const latestBySide = useMemo(() => {
    let latestBuy: SignalRow | null = null;
    let latestSell: SignalRow | null = null;
    for (const row of signals) {
      if (row.side === "BUY") {
        if (!latestBuy || row.time > latestBuy.time) latestBuy = row;
      } else if (row.side === "SELL") {
        if (!latestSell || row.time > latestSell.time) latestSell = row;
      }
    }
    return { latestBuy, latestSell };
  }, [signals]);

  useEffect(() => {
    let active = true;
    const ac = new AbortController();

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const [candlesRes, signalsRes] = await Promise.all([
          fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&tf=D&days=${days}`, {
            cache: "no-store",
            signal: ac.signal,
          }),
          fetch(`/api/signals?symbol=${encodeURIComponent(symbol)}&tf=1D&days=${days}`, {
            cache: "no-store",
            signal: ac.signal,
          }),
        ]);

        if (!candlesRes.ok) throw new Error("Candles fetch failed");
        if (!signalsRes.ok) throw new Error("Signals fetch failed");

        const candlesJson = await candlesRes.json();
        const signalsJson = await signalsRes.json();

        if (!active) return;

        setCandles((candlesJson.items ?? []) as Candle[]);
        setSignals((signalsJson.items ?? []) as SignalRow[]);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message ?? "Veri alınamadı");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      active = false;
      ac.abort();
    };
  }, [symbol, days]);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      if (!containerRef.current) return;
      await loadScript("https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js");
      if (cancelled || !containerRef.current) return;

      const lwc = (window as any).LightweightCharts;
      if (!lwc) {
        setError("Grafik kütüphanesi yüklenemedi.");
        return;
      }

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }

      const chart = lwc.createChart(containerRef.current, {
        autoSize: true,
        layout: { textColor: "#d1d5db", background: { type: lwc.ColorType.Solid, color: "#050608" } },
        grid: { vertLines: { color: "#111827" }, horzLines: { color: "#111827" } },
        crosshair: { mode: lwc.CrosshairMode.Normal },
        rightPriceScale: { borderColor: "#1f2937" },
        timeScale: { borderColor: "#1f2937", timeVisible: false },
      });

      const series = chart.addCandlestickSeries({
        upColor: "#16a34a",
        downColor: "#dc2626",
        borderUpColor: "#16a34a",
        borderDownColor: "#dc2626",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      chartRef.current = chart;
      seriesRef.current = series;

      if (candles.length) {
        series.setData(
          candles.map((c) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
      }

      if (mergedSignals.length) {
        const markers = mergedSignals.map((signal) => {
          const sides = Array.from(signal.sides);
          const sideLabel = sides.join("/");
          const reasonText = Array.from(signal.reasons).join(", ");
          const isBuyOnly = sides.length === 1 && sides[0] === "BUY";
          const isSellOnly = sides.length === 1 && sides[0] === "SELL";

          return {
            time: signal.time,
            position: "belowBar",
            shape: isSellOnly ? "arrowDown" : "arrowUp",
            color: isBuyOnly ? "#22c55e" : isSellOnly ? "#ef4444" : "#94a3b8",
            text: reasonText ? `${sideLabel}: ${reasonText}` : sideLabel,
          };
        });
        series.setMarkers(markers);
      }
    };

    mount();
    const resize = () => {
      if (chartRef.current) chartRef.current.resize(containerRef.current?.clientWidth ?? 0, containerRef.current?.clientHeight ?? 0);
    };
    window.addEventListener("resize", resize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [candles, mergedSignals]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
        <span>1G Grafik • {symbol}</span>
        <span>{loading ? "Yükleniyor..." : error ? "Hata" : `${candles.length} mum`}</span>
      </div>

      <div className="relative h-[420px] w-full rounded-xl border border-gray-800 bg-black" ref={containerRef} />

      {error && <div className="mt-3 text-xs text-red-400">{error}</div>}
      {!error && !loading && candles.length === 0 && (
        <div className="mt-3 text-xs text-gray-500">Mum verisi bulunamadı.</div>
      )}

      <div className="mt-4 rounded-xl border border-gray-800 bg-[#0b0f14] p-4">
        <div className="text-xs font-semibold text-gray-400">Son tetiklenen indikatör/formasyon etiketleri</div>
        {latestReasons && latestReasons.size ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from(latestReasons).map((label) => (
              <span
                key={label}
                className="text-[11px] rounded-full border border-gray-700 bg-gray-900/60 px-2.5 py-1 text-gray-200"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-500">Henüz sinyal etiketi bulunamadı.</div>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(["BUY", "SELL"] as const).map((side) => {
          const row = side === "BUY" ? latestBySide.latestBuy : latestBySide.latestSell;
          const labels = row ? normalizeReasonLabels(row.reasons) : [];
          return (
            <div key={side} className="rounded-xl border border-gray-800 bg-[#0b0f14] p-4">
              <div className="text-xs font-semibold text-gray-400">{side} • Son tetik</div>
              {row ? (
                <>
                  <div className="mt-1 text-[11px] text-gray-500">
                    {new Date(row.time * 1000).toLocaleString("tr-TR")}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {labels.length ? (
                      labels.map((label) => (
                        <span
                          key={`${side}-${label}`}
                          className="text-[11px] rounded-full border border-gray-700 bg-gray-900/60 px-2.5 py-1 text-gray-200"
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">Etiket yok.</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-2 text-xs text-gray-500">Bu yönde sinyal bulunamadı.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
