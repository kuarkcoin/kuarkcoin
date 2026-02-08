"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  symbol: string; // örn: "BIST:THYAO" | "NASDAQ:AAPL" | "AAPL"
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

function normalizeSymbol(sym: string) {
  const s = (sym || "").trim();
  if (!s) return s;

  // BIST_DLY -> BIST
  if (s.startsWith("BIST_DLY:")) return s.replace("BIST_DLY:", "BIST:");

  // Plain ticker gelirse (AAPL gibi) NASDAQ fallback
  if (!s.includes(":") && /^[A-Z0-9._-]{1,10}$/.test(s)) return `NASDAQ:${s}`;

  return s;
}

export default function TradingViewWidget({
  symbol,
  interval = "15",
  theme = "dark",
  height = "100%",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);

  const tvSymbol = useMemo(() => normalizeSymbol(symbol), [symbol]);

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

      // load script once
      try {
        await ensureTvScript();
      } catch {
        // sessiz kalmasın
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div style="padding:12px">TradingView yüklenemedi.</div>`;
        }
        return;
      }

      if (cancelled || !window.TradingView) return;

      // create widget
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
