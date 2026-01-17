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
  created_at: string; // ISO string
};

type Props = {
  symbol: string;
  signals: Signal[];
  resolution?: string; // şimdilik kullanılmıyor
  days?: number;       // şimdilik kullanılmıyor
  selectedSignalId?: number | null;
};

// ISO -> UTCTimestamp (seconds)
function toUTCTimestamp(iso: string): UTCTimestamp {
  const ms = Date.parse(iso);
  return Math.floor(ms / 1000) as UTCTimestamp;
}

export default function LightChart({ symbol, signals, selectedSignalId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Sinyallerden "dummy" mum üretelim (şimdilik OHLC yoksa bile chart görünsün diye)
  // Gerçek kullanımda bunu: API'den candle data çekerek değiştireceğiz.
  const candleData = useMemo<CandlestickData<UTCTimestamp>[]>(() => {
    const usable = signals
      .filter((s) => s.price != null && s.created_at)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

    if (usable.length === 0) return [];

    // aynı timestamp çakışmasın diye gerekirse +i saniye kaydır
    return usable.map((s, i) => {
      const base = (s.price ?? 0) as number;
      const t = (toUTCTimestamp(s.created_at) + i) as UTCTimestamp;

      // basit sahte OHLC: grafiğin “boş” durmaması için
      const open = base * 0.995;
      const close = base * 1.005;
      const high = Math.max(open, close) * 1.01;
      const low = Math.min(open, close) * 0.99;

      return { time: t, open, high, low, close };
    });
  }, [signals]);

  const markers = useMemo<SeriesMarker<UTCTimestamp>[]>(() => {
    const usable = signals
      .filter((s) => s.price != null && s.created_at)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

    return usable.map((s, i) => {
      const t = (toUTCTimestamp(s.created_at) + i) as UTCTimestamp;
      const isBuy = String(s.signal).toUpperCase().includes("BUY");
      const isSelected = selectedSignalId != null && s.id === selectedSignalId;

      return {
        time: t,
        position: isBuy ? "belowBar" : "aboveBar",
        shape: isBuy ? "arrowUp" : "arrowDown",
        text: `${isBuy ? "BUY" : "SELL"}${isSelected ? " ★" : ""}`,
        // color belirtmek istersen ekleyebilirsin; şart değil
      };
    });
  }, [signals, selectedSignalId]);

  // Chart init
  useEffect(() => {
    if (!containerRef.current) return;

    // Daha önce init olduysa tekrar kurma
    if (chartRef.current) return;

    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight || 320, // mobilde h=0 olmasın
      layout: {
        background: { color: "#0b0f19" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    const series = chart.addCandlestickSeries();

    chartRef.current = chart;
    seriesRef.current = series;

    // responsive resize
    const ro = new ResizeObserver(() => {
      if (!chartRef.current || !containerRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 320,
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
    <div className="w-full h-full min-h-[320px] bg-[#0b0f19] rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      {signals?.length ? null : (
        <div className="absolute inset-0 flex items-center justify-center text-white/70">
          Veri yok
        </div>
      )}
    </div>
  );
}