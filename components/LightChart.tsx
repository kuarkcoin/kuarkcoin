"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  type SeriesMarker,
} from "lightweight-charts";

type Signal = {
  id: number;
  symbol: string;
  signal: string; // "BUY" | "SELL"
  price: number | null;
  created_at: string; // ISO
};

type Props = {
  symbol: string;
  signals: Signal[];
  selectedSignalId?: number | null;
};

// ISO -> UTCTimestamp (seconds)
function toUTCTimestamp(iso: string): UTCTimestamp {
  const ms = Date.parse(iso);
  return Math.floor(ms / 1000) as UTCTimestamp;
}

export default function LightChart({ signals, selectedSignalId }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const usableSignals = useMemo(() => {
    return [...signals]
      .filter((s) => s.price != null && !!s.created_at)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  }, [signals]);

  const candleData = useMemo<CandlestickData<UTCTimestamp>[]>(() => {
    if (usableSignals.length === 0) return [];

    return usableSignals.map((s, i) => {
      const base = Number(s.price ?? 0);
      const t = (toUTCTimestamp(s.created_at) + i) as UTCTimestamp;

      // sahte OHLC (sadece chart boş kalmasın diye)
      const open = base * 0.999;
      const close = base * 1.001;
      const high = Math.max(open, close) * 1.002;
      const low = Math.min(open, close) * 0.998;

      return { time: t, open, high, low, close };
    });
  }, [usableSignals]);

  const markers = useMemo<SeriesMarker<UTCTimestamp>[]>(() => {
    if (usableSignals.length === 0) return [];

    return usableSignals.map((s, i) => {
      const t = (toUTCTimestamp(s.created_at) + i) as UTCTimestamp;
      const isBuy = String(s.signal).toUpperCase() === "BUY";
      const isSelected = selectedSignalId != null && s.id === selectedSignalId;

      return {
        time: t,
        position: isBuy ? "belowBar" : "aboveBar",
        shape: isBuy ? "arrowUp" : "arrowDown",
        text: `${isBuy ? "BUY" : "SELL"}${isSelected ? " ★" : ""}`,
        // renk istersen:
        color: isBuy ? "#22c55e" : "#ef4444",
      };
    });
  }, [usableSignals, selectedSignalId]);

  // Chart init + resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) return;

    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.clientWidth || 800,
      height: el.clientHeight || 360,
      layout: {
        background: { color: "#000000" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.08)" },
        horzLines: { color: "rgba(255,255,255,0.08)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      // 🔥 kritik: height 0 gelirse düşmeyelim
      chartRef.current.applyOptions({
        width: w || 800,
        height: (h && h >= 200) ? h : 360,
      });
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Data set
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    if (candleData.length === 0) {
      series.setData([]);
      series.setMarkers([]);
      return;
    }

    series.setData(candleData);
    series.setMarkers(markers);
    chart.timeScale().fitContent();
  }, [candleData, markers]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full min-h-[360px] bg-black rounded-xl overflow-hidden"
    >
      {/* container kesin yükseklik alsın */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full min-h-[360px]" />

      {candleData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          Sinyal verisi bekleniyor...
        </div>
      )}
    </div>
  );
}