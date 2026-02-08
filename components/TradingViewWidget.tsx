"use client";

import { useEffect, useMemo, useRef } from "react";

type MarketHint = "BIST" | "NASDAQ" | "ETF" | "CRYPTO" | "AUTO";

type Props = {
  symbol: string; // örn: "BIST:THYAO" | "NASDAQ:AAPL" | "ARCLK" | "AAPL"
  interval?: string; // "1" "5" "15" "60" "1D" vb. (TradingView widget string kabul eder)
  theme?: "dark" | "light";
  height?: number | string;

  /**
   * Plain ticker (ARCLK, AAPL) gelirse hangi market prefix’i eklensin?
   * Terminalde hangi sekme seçiliyse onu yolla: "BIST" / "NASDAQ" / "CRYPTO" / "ETF"
   * BIST görünmeme sorununu bitiren ana nokta: BIST’te TVC’ye çevirmiyoruz.
   */
  marketHint?: MarketHint;
};

declare global {
  interface Window {
    TradingView?: any;
  }
}

/** tv.js'i tek sefer yükle */
function ensureTvScript(timeoutMs = 12000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>('script[data-tvjs="1"]');
  if (existing) {
    return new Promise((res, rej) => {
      const onLoad = () => res();
      const onErr = () => rej(new Error("tv.js load error"));
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onErr, { once: true });

      // güvenlik timeout
      window.setTimeout(() => {
        if (!window.TradingView) rej(new Error("tv.js load timeout"));
      }, timeoutMs);
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

    // güvenlik timeout
    window.setTimeout(() => {
      if (!window.TradingView) reject(new Error("tv.js load timeout"));
    }, timeoutMs);
  });
}

function isPlainTicker(s: string) {
  // ARCLK, AAPL, BTCUSDT, THYAO gibi
  return /^[A-Z0-9._-]{1,20}$/.test(s);
}

function normalizeSymbol(sym: string, marketHint: MarketHint): string {
  const s0 = (sym || "").trim();
  if (!s0) return s0;

  // Sende vardı: BIST_DLY -> BIST
  if (s0.startsWith("BIST_DLY:")) return s0.replace("BIST_DLY:", "BIST:");

  // Zaten prefix varsa (BIST:, NASDAQ:, BINANCE: vs) dokunma
  if (s0.includes(":")) return s0;

  // Plain ticker ise hint’e göre prefix ekle
  const s = s0.toUpperCase();
  if (!isPlainTicker(s)) return s0;

  // CRYPTO ör: BTCUSDT -> BINANCE:BTCUSDT
  if (marketHint === "CRYPTO") return `BINANCE:${s}`;

  // ETF çoğunlukla AMEX/NYSEARCA’da; TradingView genelde "AMEX:" ile çalışır
  // Ama bazı ETF'ler NYSEARCA. En güvenlisi: kullanıcı zaten ETF listesini "SPY" gibi veriyorsa "AMEX:" denenir.
  if (marketHint === "ETF") return `AMEX:${s}`;

  // NASDAQ
  if (marketHint === "NASDAQ") return `NASDAQ:${s}`;

  // BIST: kritik fix -> TVC değil, BIST
  if (marketHint === "BIST") return `BIST:${s}`;

  // AUTO fallback: kriptoda USDT varsa BINANCE, yoksa NASDAQ
  if (s.endsWith("USDT") || s.endsWith("USD")) return `BINANCE:${s}`;
  return `NASDAQ:${s}`;
}

export default function TradingViewWidget({
  symbol,
  interval = "15",
  theme = "dark",
  height = "100%",
  marketHint = "AUTO",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);

  const tvSymbol = useMemo(() => normalizeSymbol(symbol, marketHint), [symbol, marketHint]);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      const el = containerRef.current;
      if (!el) return;

      // önce eski widget'ı temizle
      try {
        widgetRef.current?.remove?.();
      } catch {}
      widgetRef.current = null;

      // container reset
      el.innerHTML = "";

      const widgetId = `tv-${Math.random().toString(36).slice(2)}`;
      el.innerHTML = `<div id="${widgetId}" style="height:${
        typeof height === "number" ? `${height}px` : height
      }; width:100%"></div>`;

      try {
        await ensureTvScript();
      } catch (err) {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<div style="padding:12px">TradingView yüklenemedi.</div>`;
        }
        return;
      }

      if (cancelled || !window.TradingView) return;

      // widget create
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

