"use client";

import { useEffect, useMemo, useRef } from "react";

type Market = "AUTO" | "BIST" | "NASDAQ" | "CRYPTO";

type Props = {
  symbol: string; // "BIST:THYAO" | "NASDAQ:AAPL" | "BINANCE:BTCUSDT" | "AKBNK" | "AAPL"
  market?: Market; // ✅ yeni
  interval?: string;
  theme?: "dark" | "light";
  height?: number | string;
};

declare global {
  interface Window {
    TradingView?: any;
  }
}

function ensureTvScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>('script[data-tvjs="1"]');
  if (existing) {
    return new Promise((res, rej) => {
      existing.addEventListener("load", () => res(), { once: true });
      existing.addEventListener("error", () => rej(new Error("tv.js load error")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.dataset.tvjs = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("tv.js load error"));
    document.head.appendChild(s);
  });
}

function normalizeSymbol(sym: string, market: Market) {
  const s0 = (sym || "").trim().toUpperCase();
  if (!s0) return s0;

  // BIST_DLY -> BIST
  if (s0.startsWith("BIST_DLY:")) return s0.replace("BIST_DLY:", "BIST:");

  // Zaten exchange varsa dokunma
  if (s0.includes(":")) return s0;

  // Çıplak ticker: market'e göre prefix bas
  if (market === "BIST") return `BIST:${s0}`;
  if (market === "NASDAQ") return `NASDAQ:${s0}`;
  if (market === "CRYPTO") return `BINANCE:${s0}`; // BTCUSDT gibi

  // AUTO: BIST hisseleri çoğunlukla 5 harf (AKBNK, THYAO) → heuristik
  // (istersen bunu BIST listesiyle daha kesin yaparız)
  if (/^[A-Z]{5}$/.test(s0)) return `BIST:${s0}`;

  // default: NASDAQ
  return `NASDAQ:${s0}`;
}

export default function TradingViewWidget({
  symbol,
  market = "AUTO",
  interval = "15",
  theme = "dark",
  height = "100%",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);

  const tvSymbol = useMemo(() => normalizeSymbol(symbol, market), [symbol, market]);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      if (!containerRef.current) return;

      // cleanup old widget
      try {
        widgetRef.current?.remove?.();
      } catch {}
      widgetRef.current = null;

      // reset container
      containerRef.current.innerHTML = "";

      const widgetId = `tv-${Math.random().toString(36).slice(2)}`;
      containerRef.current.innerHTML = `<div id="${widgetId}" style="height:${
        typeof height === "number" ? `${height}px` : height
      }; width:100%"></div>`;

      try {
        await ensureTvScript();
      } catch {
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div style="padding:12px">TradingView yüklenemedi.</div>`;
        }
        return;
      }

      if (cancelled || !window.TradingView) return;

      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval,
        timezone: "Europe/Istanbul",
        theme,
        style: "1",
        locale: "tr",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        withdateranges: true,
        allow_symbol_change: false,
        container_id: widgetId,
      });
    };

    mount();

    return () => {
      cancelled = true;
      try {
        widgetRef.current?.remove?.();
      } catch {}
      widgetRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [tvSymbol, interval, theme, height]);

  return <div ref={containerRef} className="w-full h-full" />;
}
