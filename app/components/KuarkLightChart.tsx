"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type CandlestickData,
} from "lightweight-charts";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Signal = {
  created_at?: string;
  time?: number;
  side?: string;
  signal?: string;
  score?: number;
  price?: number;
};

type Props = {
  candles: Candle[];
  signals: Signal[];
};

const BUY_ALIASES = new Set(["BUY", "AL", "LONG"]);
const SELL_ALIASES = new Set(["SELL", "SAT", "SHORT"]);

function normalizeSide(value?: string): "BUY" | "SELL" | null {
  const side = String(value ?? "")
    .trim()
    .toUpperCase();

  if (BUY_ALIASES.has(side)) return "BUY";
  if (SELL_ALIASES.has(side)) return "SELL";
  return null;
}

function toUnixSeconds(signal: Signal): number | null {
  if (typeof signal.time === "number" && Number.isFinite(signal.time)) {
    return Math.floor(signal.time);
  }

  if (signal.created_at) {
    const ms = Date.parse(signal.created_at);
    if (Number.isFinite(ms)) return Math.floor(ms / 1000);
  }

  return null;
}

export default function KuarkLightChart({ candles, signals }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const normalizedCandles = useMemo<CandlestickData<UTCTimestamp>[]>(() => {
    return candles
      .map((c) => ({
        time: Math.floor(Number(c.time)) as UTCTimestamp,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      }))
      .filter(
        (c) =>
          Number.isFinite(c.time) &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close),
      )
      .sort((a, b) => Number(a.time) - Number(b.time));
  }, [candles]);

  const markers = useMemo(() => {
    try {
      return signals
        .map((s) => {
          const side = normalizeSide(s.side ?? s.signal);
          const time = toUnixSeconds(s);

          if (!side || !time) return null;

          const scorePart = typeof s.score === "number" ? ` • ${s.score}` : "";

          return {
            time: time as UTCTimestamp,
            position: side === "BUY" ? "belowBar" : "aboveBar",
            shape: side === "BUY" ? "arrowUp" : "arrowDown",
            color: side === "BUY" ? "#22c55e" : "#ef4444",
            text: `${side}${scorePart}`,
          } as const;
        })
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .sort((a, b) => Number(a.time) - Number(b.time));
    } catch {
      return [];
    }
  }, [signals]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 520,
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor: "#c9d1d9",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      rightPriceScale: {
        borderColor: "#374151",
      },
      timeScale: {
        borderColor: "#374151",
      },
      crosshair: {
        vertLine: { color: "#4b5563" },
        horzLine: { color: "#4b5563" },
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      chart.applyOptions({ width: entry.contentRect.width });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(normalizedCandles);
    if (normalizedCandles.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [normalizedCandles]);

  useEffect(() => {
    if (!seriesRef.current) return;

    try {
      seriesRef.current.setMarkers(markers);
    } catch {
      seriesRef.current.setMarkers([]);
    }
  }, [markers]);

  return <div ref={containerRef} className="w-full rounded-xl border border-gray-800 bg-[#0d1117]" />;
}
