"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  symbol: string; // "BIST:THYAO" | "TVC:THYAO" | "NASDAQ:AAPL" | "AAPL"
  interval?: string;
  theme?: "dark" | "light";
  height?: number | string;

  /**
   * BIST için varsayılan kaynak:
   * - "auto": BIST gelirse TVC'ye çevir (en stabil)
   * - "bist": zorla BIST:
   * - "tvc": zorla TVC:
   */
  bistSource?: "auto" | "bist" | "tvc";

  /**
   * Widget “boş kaldı” hissini engellemek için:
   * chart hazır olsa bile BIST veri yetkisi yoksa iframe boş kalabiliyor.
   * Bu durumda kullanıcıya açıklama gösteriyoruz.
   */
  showFallbackHint?: boolean;
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

function normalizeSymbol(sym: string, bistSource: Props["bistSource"]): string {
  const s = (sym || "").trim();
  if (!s) return s;

  // BIST_DLY -> BIST
  const s1 = s.startsWith("BIST_DLY:") ? s.replace("BIST_DLY:", "BIST:") : s;

  // Plain ticker gelirse NASDAQ fallback
  if (!s1.includes(":") && /^[A-Z0-9._-]{1,12}$/.test(s1)) return `NASDAQ:${s1}`;

  // BIST -> TVC fix (auto modda)
  if (s1.startsWith("BIST:")) {
    if (bistSource === "bist") return s1;
    if (bistSource === "tvc") return s1.replace("BIST:", "TVC:");
    // auto
    return s1.replace("BIST:", "TVC:");
  }

  return s1;
}

export default function TradingViewWidget({
  symbol,
  interval = "15",
  theme = "dark",
  height = "100%",
  bistSource = "auto",
  showFallbackHint = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);

  // Kullanıcı “alternatif kaynakla dene” dediğinde burada flip’liyoruz
  const [altFlip, setAltFlip] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const tvSymbol = useMemo(() => {
    // flip = BIST<->TVC
    const effectiveSource: Props["bistSource"] =
      bistSource === "auto"
        ? altFlip
          ? "bist" // ilk TVC denedik, olmazsa BIST'e dön
          : "tvc"  // auto modda TVC ile başla
        : bistSource;

    return normalizeSymbol(symbol, effectiveSource);
  }, [symbol, bistSource, altFlip]);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      setHint(null);

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

      // “Boş kaldı” hissi için açıklama:
      // tv.js widget veri yoksa genelde hata fırlatmaz, iframe boş gibi kalır.
      // Kesin tespit API yok; bu yüzden kontrollü, kullanıcıya net bilgi veriyoruz.
      if (showFallbackHint) {
        const isBistLike = symbol.trim().startsWith("BIST:") || symbol.trim().startsWith("BIST_DLY:");
        if (isBistLike) {
          // 2.5s sonra hala UI "şüpheli" ise hint ver
          setTimeout(() => {
            if (cancelled) return;
            // iframe var mı?
            const iframe = containerRef.current?.querySelector("iframe");
            if (!iframe) {
              setHint("BIST verisi TradingView’de bu hesapta / bölgede kapalı olabilir. TVC/BIST alternatifini deneyebilirsin.");
              return;
            }
            // iframe var ama yine de veri gelmeyebilir → gene de açıklama vermek OK
            setHint("BIST hisseleri TradingView widget’ında bazen veri kısıtı yüzünden boş kalabilir. Alternatif kaynağı deneyebilirsin (TVC/BIST).");
          }, 2500);
        }
      }
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
  }, [tvSymbol, interval, theme, height, showFallbackHint, symbol]);

  const showAltButton = symbol.trim().startsWith("BIST:") || symbol.trim().startsWith("BIST_DLY:");

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {(hint || showAltButton) && (
        <div className="mt-2 flex flex-col gap-2 text-sm">
          {hint && <div className="opacity-80">{hint}</div>}

          {showAltButton && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAltFlip((v) => !v)}
                className="rounded-md border px-3 py-1 hover:opacity-90"
              >
                Alternatif Kaynakla Dene ({altFlip ? "BIST:" : "TVC:"})
              </button>

              <a
                className="underline opacity-80 hover:opacity-100"
                href={`https://tr.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`}
                target="_blank"
                rel="noreferrer"
              >
                TradingView’de aç
              </a>

              <span className="opacity-60">
                (İstersen BIST için lightweight-charts ile %100 kontrol sağlayabiliriz.)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
