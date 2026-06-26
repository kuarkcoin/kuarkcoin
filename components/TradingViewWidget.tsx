"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  symbol: string;
  interval?: string;
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

  const tvSymbol = useMemo(() => {
    if (!symbol) return symbol;
    if (symbol.startsWith("BIST_DLY:")) return symbol.replace("BIST_DLY:", "BIST:");
    return symbol;
  }, [symbol]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";
    const widgetId = `tv-${Math.random().toString(36).slice(2)}`;

    const mount = () => {
      if (!window.TradingView) return;

      new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,          // ✅ normalize edilmiş sembol
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

    container.innerHTML = `<div id="${widgetId}" style="height:${typeof height === "number" ? `${height}px` : height}; width:100%"></div>`;

    // ✅ tv.js zaten yüklenmişse tekrar script basma
    if (window.TradingView) {
      mount();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = mount;

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [tvSymbol, interval, theme, height]);

  return <div ref={containerRef} className="w-full h-full" />;
}