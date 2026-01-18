"use client";

import { useEffect, useRef } from "react";

type Props = {
  symbol: string;         // "NASDAQ:AAPL", "BINANCE:BTCUSDT", "AMEX:SPY"
  interval?: string;      // "15", "60", "D"
  theme?: "dark" | "light";
  height?: number | string;
};

declare global {
  interface Window {
    TradingView?: any;
  }
}

export default function TradingViewWidget({
  symbol,
  interval = "15",
  theme = "dark",
  height = "100%",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string>("");

  // her sembolde yeniden kur
  useEffect(() => {
    if (!containerRef.current) return;

    // container temizle
    containerRef.current.innerHTML = "";
    const widgetId = `tv-${Math.random().toString(36).slice(2)}`;
    widgetIdRef.current = widgetId;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;

    script.onload = () => {
      if (!window.TradingView || !containerRef.current) return;

      // TradingView widget’i üret
      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: "Europe/Istanbul",
        theme,
        style: "1",
        locale: "tr",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        withdateranges: true,
        allow_symbol_change: false, // sembol değişimi bizden gelsin
        container_id: widgetId,
      });
    };

    containerRef.current.innerHTML = `<div id="${widgetId}" style="height:${typeof height === "number" ? `${height}px` : height}; width:100%"></div>`;
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol, interval, theme, height]);

  return <div ref={containerRef} className="w-full h-full" />;
}