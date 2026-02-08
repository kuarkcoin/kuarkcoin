"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MarketHint = "BIST" | "NASDAQ" | "ETF" | "CRYPTO" | "AUTO";

type Props = {
  symbol: string; // "BIST:THYAO" | "NASDAQ:AAPL" | "AKBNK" | "AAPL" | "BTCUSDT"
  interval?: string; // "1" "5" "15" "60" "1D" vb.
  theme?: "dark" | "light";
  height?: number | string;
  marketHint?: MarketHint;

  /** BIST için: önce TVC dene, olmazsa BIST'e düş */
  enableBistFallback?: boolean;

  /** tv.js yükleme timeout */
  scriptTimeoutMs?: number;
};

type NormalizedSymbol = {
  primary: string;
  fallback: string | null;
  market: MarketHint;
};

declare global {
  interface Window {
    TradingView?: any;
  }
}

/** tv.js tek sefer yükle */
function ensureTvScript(timeoutMs = 12000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>('script[data-tvjs="1"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      const onLoad = () => resolve();
      const onErr = () => reject(new Error("tv.js load error"));

      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onErr, { once: true });

      window.setTimeout(() => {
        if (!window.TradingView) reject(new Error("tv.js load timeout"));
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

    window.setTimeout(() => {
      if (!window.TradingView) reject(new Error("tv.js load timeout"));
    }, timeoutMs);
  });
}

function isPlainTicker(s: string) {
  return /^[A-Z0-9._-]{1,20}$/.test(s);
}

/**
 * ✅ HER ZAMAN NormalizedSymbol döndürür (union yok)
 */
function normalizeSymbol(sym: string, marketHint: MarketHint): NormalizedSymbol {
  const s0 = (sym || "").trim();
  if (!s0) return { primary: "", fallback: null, market: marketHint };

  // BIST_DLY: -> BIST:
  const base = s0.startsWith("BIST_DLY:") ? s0.replace("BIST_DLY:", "BIST:") : s0;
  const up = base.toUpperCase();

  // "BIST:XXXX" => primary TVC, fallback BIST
  if (up.startsWith("BIST:")) {
    const t = up.slice("BIST:".length);
    return { primary: `TVC:${t}`, fallback: `BIST:${t}`, market: "BIST" };
  }

  // Prefix varsa dokunma (NASDAQ:, BINANCE:, TVC:, AMEX: vb.)
  if (up.includes(":")) {
    return { primary: up, fallback: null, market: marketHint };
  }

  // Plain ticker değilse olduğu gibi
  if (!isPlainTicker(up)) {
    return { primary: base, fallback: null, market: marketHint };
  }

  // Plain ticker
  const t = up;

  if (marketHint === "CRYPTO") return { primary: `BINANCE:${t}`, fallback: null, market: "CRYPTO" };
  if (marketHint === "ETF") return { primary: `AMEX:${t}`, fallback: null, market: "ETF" };
  if (marketHint === "NASDAQ") return { primary: `NASDAQ:${t}`, fallback: null, market: "NASDAQ" };

  // BIST plain ticker => TVC primary, BIST fallback
  if (marketHint === "BIST") return { primary: `TVC:${t}`, fallback: `BIST:${t}`, market: "BIST" };

  // AUTO
  if (t.endsWith("USDT") || t.endsWith("USD")) return { primary: `BINANCE:${t}`, fallback: null, market: "CRYPTO" };
  return { primary: `NASDAQ:${t}`, fallback: null, market: "NASDAQ" };
}

export default function TradingViewWidget({
  symbol,
  interval = "1D",
  theme = "dark",
  height = "100%",
  marketHint = "AUTO",
  enableBistFallback = true,
  scriptTimeoutMs = 12000,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);

  const [err, setErr] = useState<string | null>(null);

  const sym = useMemo(() => normalizeSymbol(symbol, marketHint), [symbol, marketHint]);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: number | null = null;

    const destroy = () => {
      try {
        widgetRef.current?.remove?.();
      } catch {}
      widgetRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };

    const mountWith = async (tvSymbol: string) => {
      const el = containerRef.current;
      if (!el) return;

      setErr(null);
      destroy();

      const widgetId = `tv-${Math.random().toString(36).slice(2)}`;
      el.innerHTML = `<div id="${widgetId}" style="height:${
        typeof height === "number" ? `${height}px` : height
      }; width:100%"></div>`;

      await ensureTvScript(scriptTimeoutMs);
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

    const mount = async () => {
      try {
        // 1) primary
        await mountWith(sym.primary);

        // 2) BIST fallback: 1.8sn sonra hala render yoksa fallback dene
        const shouldTryFallback =
          enableBistFallback &&
          !!sym.fallback &&
          (sym.market === "BIST" || sym.primary.startsWith("TVC:"));

        if (shouldTryFallback) {
          fallbackTimer = window.setTimeout(async () => {
            if (cancelled) return;
            const el = containerRef.current;
            if (!el) return;

            // render olmuş gibi görünüyorsa dokunma
            const looksRendered = el.querySelector("iframe, canvas, .tv-chart-view") != null;
            if (looksRendered) return;

            try {
              await mountWith(sym.fallback!);
            } catch {
              setErr("TradingView grafiği yüklenemedi (TVC/BIST denendi).");
            }
          }, 1800);
        }
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ?? "TradingView yüklenemedi.");
      }
    };

    mount();

    return () => {
      cancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      destroy();
    };
  }, [sym.primary, sym.fallback, sym.market, interval, theme, height, enableBistFallback, scriptTimeoutMs]);

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {err && <div className="mt-2 text-xs text-red-400">{err}</div>}
    </div>
  );
}
