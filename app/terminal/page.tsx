// app/terminal/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { useSignals, type SignalRow } from "@/hooks/useSignals";
import { reasonsToTechSentences } from "@/lib/reasonTranslator";
import { ASSETS, REASON_LABEL, parseReasons, symbolToPlain, timeAgo } from "@/constants/terminal";
import DashboardView from "@/components/DashboardView";

// ──────────────────────────────────────────────────
// Small hook: useDebounce
// ──────────────────────────────────────────────────
function useDebounce<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────
type AssetsMap = {
  NASDAQ: string[];
  ETF: string[];
  CRYPTO: string[];
  BIST?: string[];
};

const ASSETS_MAP: AssetsMap = {
  NASDAQ: (ASSETS as any).NASDAQ ?? [],
  ETF: (ASSETS as any).ETF ?? [],
  CRYPTO: (ASSETS as any).CRYPTO ?? [],
  BIST: (ASSETS as any).BIST ?? [],
};

type AssetCategory = keyof AssetsMap;

type NewsItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number;
  summary?: string;
  relevance?: number;
  matched?: string[];
};

// ──────────────────────────────────────────────────
// Sets (perf + includes() TS fix)
// ──────────────────────────────────────────────────
const NASDAQ_SET = new Set<string>((ASSETS_MAP.NASDAQ ?? []).map((s) => String(s).toUpperCase()));
const ETF_SET = new Set<string>((ASSETS_MAP.ETF ?? []).map((s) => String(s).toUpperCase()));
const CRYPTO_SET = new Set<string>((ASSETS_MAP.CRYPTO ?? []).map((s) => String(s).toUpperCase()));
const BIST_SET = new Set<string>(((ASSETS_MAP.BIST ?? []) as string[]).map((s) => String(s).toUpperCase()));

// ──────────────────────────────────────────────────
// UI Helpers
// ──────────────────────────────────────────────────
function scoreBadge(signal: string | null | undefined, score: number | null | undefined) {
  const s = String(signal ?? "").toUpperCase();
  const sc = Number(score ?? 0);

  const strength = sc >= 25 ? "ÇOK GÜÇLÜ" : sc >= 18 ? "GÜÇLÜ" : sc >= 12 ? "ORTA" : "ZAYIF";
  if (s === "BUY") return `BUY • ${strength}`;
  if (s === "SELL") return `SELL • ${strength}`;
  return strength;
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="w-6 h-6 relative">
      <span
        className={`absolute left-0 top-1.5 h-0.5 w-6 bg-white transition-all duration-200 ${
          open ? "translate-y-2 rotate-45" : ""
        }`}
      />
      <span
        className={`absolute left-0 top-3 h-0.5 w-6 bg-white transition-opacity duration-200 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 top-[18px] h-0.5 w-6 bg-white transition-all duration-200 ${
          open ? "-translate-y-2 -rotate-45" : ""
        }`}
      />
    </div>
  );
}

function ReasonBadges({ reasons }: { reasons: string | null }) {
  const list = parseReasons(reasons);
  if (!list.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {list.map((key, i) => (
        <span
          key={`${key}-${i}`}
          className="text-[10px] px-2.5 py-1 rounded-full border border-gray-700 bg-gray-800/50 text-gray-200 cursor-help"
          title={`${REASON_LABEL[key] || key}: Teknik gösterge kırılımı / formasyon onayı.`}
        >
          {REASON_LABEL[key] ?? key}
        </span>
      ))}
    </div>
  );
}

function TechLine({ reasons }: { reasons: string | null }) {
  const tech = reasonsToTechSentences(reasons);
  if (!tech) return null;
  return <div className="mt-2 text-[11px] leading-relaxed text-gray-300">{tech}</div>;
}

function ScoreChip({ signal, score }: { signal: string | null | undefined; score: number | null | undefined }) {
  const text = scoreBadge(signal, score);
  const sig = String(signal ?? "").toUpperCase();

  const cls =
    sig === "BUY"
      ? "border-green-700 text-green-200 bg-green-950/30"
      : sig === "SELL"
      ? "border-red-700 text-red-200 bg-red-950/30"
      : "border-gray-700 text-gray-200 bg-gray-900/30";

  return <div className={`inline-flex items-center px-2 py-1 rounded-md border text-[10px] ${cls}`}>{text}</div>;
}

function SignalSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-gray-800 bg-[#0d1117] animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 w-14 bg-gray-800 rounded" />
        <div className="h-3 w-10 bg-gray-800 rounded" />
      </div>
      <div className="h-3 w-48 bg-gray-800 rounded mb-2" />
      <div className="h-3 w-24 bg-gray-800 rounded" />
      <div className="flex gap-2 mt-3">
        <div className="h-5 w-20 bg-gray-800 rounded-full" />
        <div className="h-5 w-24 bg-gray-800 rounded-full" />
      </div>
      <div className="flex gap-2 mt-4">
        <div className="h-8 flex-1 bg-gray-800 rounded" />
        <div className="h-8 flex-1 bg-gray-800 rounded" />
        <div className="h-8 flex-1 bg-gray-800 rounded" />
      </div>
    </div>
  );
}

function formatNewsTime(unixSec?: number) {
  if (!unixSec) return "";
  try {
    return new Date(unixSec * 1000).toLocaleString("tr-TR");
  } catch {
    return "";
  }
}

// ──────────────────────────────────────────────────
// Market status (approx)
// ──────────────────────────────────────────────────
function marketStatusTRandUS() {
  const now = new Date();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  const h = now.getHours();
  const m = now.getMinutes();

  const trOpen = !isWeekend && ((h > 10 || (h === 10 && m >= 0)) && (h < 18 || (h === 18 && m <= 10)));
  const usOpen = !isWeekend && ((h > 16 || (h === 16 && m >= 30)) && (h < 23 || (h === 23 && m <= 0)));

  return { trOpen, usOpen, isWeekend };
}

// ──────────────────────────────────────────────────
// Tiny sparkline
// ──────────────────────────────────────────────────
function Sparkline({ points }: { points?: number[] | null }) {
  if (!points || points.length < 3) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const norm = points.map((p) => (max === min ? 0.5 : (p - min) / (max - min)));

  const d = norm
    .map((v, i) => {
      const x = (i * 100) / (norm.length - 1);
      const y = 30 - v * 28;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 30" className="w-20 h-6 text-gray-300/80" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────
function normalizeSymbol(sym: string) {
  const s = String(sym || "").trim();
  if (!s) return "NASDAQ:AAPL";
  if (s.includes(":")) return s;
  return `NASDAQ:${s}`;
}

function uniqBy<T>(arr: T[], keyFn: (t: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

// ──────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────
export default function TerminalPage() {
  // ── core state ───────────────────────────────────
  const [selectedSymbol, setSelectedSymbol] = useState("NASDAQ:AAPL");
  const [activeCategory, setActiveCategory] = useState<AssetCategory>("NASDAQ");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSignalId, setSelectedSignalId] = useState<number | null>(null);
  const [onlySelectedSymbol, setOnlySelectedSymbol] = useState(false);

  // Mobile tabs (chart / signals)
  const [mobileTab, setMobileTab] = useState<"DASH" | "CHART" | "SIGNALS">("DASH");

  // Audio toggle
  const [audioOn, setAudioOn] = useState(false);

  // Dashboard toggle (desktop)
  const [showDashboard, setShowDashboard] = useState(true);

  // API + polling hook
  const { signals, loadingSignals, todayTopBuy, todayTopSell, refreshAll, setOutcome } = useSignals({
    pollMs: 300_000,
  });

  // Better empty/loading/error discrimination
  const uiLoading = loadingSignals && (!signals || signals.length === 0);
  const uiEmpty = !loadingSignals && (!signals || signals.length === 0);

  // Title
  useEffect(() => {
    document.title = `${symbolToPlain(selectedSymbol)} | Kuark Terminal`;
  }, [selectedSymbol]);

  // Visible refresh
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refreshAll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refreshAll]);

  // ✅ Body scroll kilitleme (sidebar açıkken)
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Audio on new signal
  const lastSignalCount = useRef(0);
  useEffect(() => {
    if (!audioOn) {
      lastSignalCount.current = signals.length;
      return;
    }
    if (signals.length > lastSignalCount.current && lastSignalCount.current !== 0) {
      const audio = new Audio("/alert.mp3");
      audio.play().catch(() => {});
    }
    lastSignalCount.current = signals.length;
  }, [signals, audioOn]);

  // Favorites
  const FAV_KEY = "kuark:favs";
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    try {
      setFavs(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
    } catch {
      setFavs([]);
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch {}
  }, [favs]);

  const isFav = useCallback((sym: string) => favs.includes(sym), [favs]);
  const toggleFav = useCallback((sym: string) => {
    setFavs((p) => (p.includes(sym) ? p.filter((x) => x !== sym) : [sym, ...p]));
  }, []);

  // Limits + load more
  const [signalLimit, setSignalLimit] = useState(110);

  // prefix resolver
  const prefixForSymbol = useCallback((sym: string) => {
    const s = String(sym || "").toUpperCase();
    if (BIST_SET.has(s)) return "BIST";
    if (CRYPTO_SET.has(s)) return "BINANCE";
    if (ETF_SET.has(s)) return "AMEX";
    return "NASDAQ";
  }, []);

  // Assets filtered
  const filteredAssets = useMemo(() => {
    const base = (ASSETS_MAP[activeCategory] ?? []).slice();
    const q = debouncedSearch.trim().toLowerCase();
    const list = q ? base.filter((sym) => String(sym).toLowerCase().includes(q)) : base;

    // favorites first (stable-ish)
    return list.sort((a, b) => (isFav(String(b)) ? 1 : 0) - (isFav(String(a)) ? 1 : 0));
  }, [activeCategory, debouncedSearch, isFav]);

  // Latest per symbol map
  const lastSignalMap = useMemo(() => {
    const m = new Map<string, SignalRow>();
    for (const r of signals) {
      const p = symbolToPlain(r.symbol);
      if (!m.has(p)) m.set(p, r);
    }
    return m;
  }, [signals]);

  const signaledSymbols = useMemo(() => new Set(signals.map((r) => symbolToPlain(r.symbol))), [signals]);
  const selectedPlainSymbol = useMemo(() => symbolToPlain(selectedSymbol), [selectedSymbol]);
  const selectedSignals = useMemo(() => {
    return signals.filter((r) => symbolToPlain(r.symbol) === selectedPlainSymbol);
  }, [signals, selectedPlainSymbol]);
  const sortedSelectedSignals = useMemo(() => {
    return [...selectedSignals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [selectedSignals]);
  const chartSignalPreview = sortedSelectedSignals.slice(0, 5);

  const visibleSignals = useMemo(() => {
    const last = signals.slice(0, signalLimit);
    if (!onlySelectedSymbol) return last;
    return last.filter((s) => symbolToPlain(s.symbol) === selectedPlainSymbol);
  }, [signals, selectedPlainSymbol, onlySelectedSymbol, signalLimit]);

  const winrate = useMemo(() => {
    const decided = visibleSignals.filter((r) => r.outcome != null);
    if (decided.length === 0) return null;
    const wins = decided.filter((r) => r.outcome === "WIN").length;
    return Math.round((wins / decided.length) * 100);
  }, [visibleSignals]);

  const totalAssetsCount = useMemo(() => {
    return (
      (ASSETS_MAP.NASDAQ?.length ?? 0) +
      (ASSETS_MAP.ETF?.length ?? 0) +
      (ASSETS_MAP.CRYPTO?.length ?? 0) +
      (ASSETS_MAP.BIST?.length ?? 0)
    );
  }, []);

  const tvUrl = useMemo(() => {
    const s = encodeURIComponent(selectedSymbol);
    return `https://www.tradingview.com/chart/?symbol=${s}`;
  }, [selectedSymbol]);

  // ── Dashboard data ───────────────────────────────
  const dashSignals = useMemo(() => {
    const uniq = uniqBy(signals, (r) => symbolToPlain(r.symbol));
    return uniq.slice(0, 48);
  }, [signals]);

  // ──────────────────────────────────────────────────
  // AI daily digest
  // ──────────────────────────────────────────────────
  const [aiCommentary, setAiCommentary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  const runAiCommentary = useCallback(async () => {
    try {
      setAiLoading(true);
      setAiError("");

      const res = await fetch("/api/ai/daily-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topBuy: todayTopBuy, topSell: todayTopSell }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "AI failed");
      setAiCommentary(json.commentary || "");
    } catch (err: any) {
      setAiError(err?.message ?? "AI yorum alınamadı");
    } finally {
      setAiLoading(false);
    }
  }, [todayTopBuy, todayTopSell]);

  const copyAi = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(aiCommentary || "");
    } catch {}
  }, [aiCommentary]);

  // ──────────────────────────────────────────────────
  // News state + Smart score
  // ──────────────────────────────────────────────────
  const [newsLoadingFor, setNewsLoadingFor] = useState<string>("");
  const [newsErrorFor, setNewsErrorFor] = useState<Record<string, string>>({});
  const [newsCache, setNewsCache] = useState<Record<string, NewsItem[]>>({});
  const [openNewsForSymbol, setOpenNewsForSymbol] = useState<string>("");

  const [smartScore, setSmartScore] = useState<Record<string, { score: number; impact: string; explanation: string }>>(
    {}
  );

  const lastNewsFetchAt = useRef<Record<string, number>>({});
  const newsCacheRef = useRef<Record<string, NewsItem[]>>({});
  useEffect(() => {
    newsCacheRef.current = newsCache;
  }, [newsCache]);

  const analyzeWithGemini = useCallback(
    async (symbol: string, items: NewsItem[]) => {
      const plain = symbolToPlain(symbol);
      if (!items?.length) return;
      if (smartScore[plain]) return;

      try {
        const res = await fetch("/api/ai/analyze-news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: plain, newsItems: items }),
        });
        const data = await res.json();
        if (data?.ok) {
          setSmartScore((prev) => ({
            ...prev,
            [plain]: {
              score: Number(data.score ?? 0),
              impact: String(data.impact ?? "LOW"),
              explanation: String(data.explanation ?? ""),
            },
          }));
        }
      } catch {}
    },
    [smartScore]
  );

  const fetchNewsForSymbol = useCallback(
    async (symbol: string, reasons: string | null) => {
      const plain = symbolToPlain(symbol);

      // cache hit
      if (newsCacheRef.current[plain]) return;

      // rate limit
      const now = Date.now();
      if (lastNewsFetchAt.current[plain] && now - lastNewsFetchAt.current[plain] < 30_000) return;
      lastNewsFetchAt.current[plain] = now;

      const reasonKeys = parseReasons(reasons).join(",");

      try {
        setNewsLoadingFor(plain);
        setNewsErrorFor((p) => ({ ...p, [plain]: "" }));

        // ✅ aynı endpoint: BIST ise backend KAP RSS döndürüyor
        const url = `/api/news?symbol=${encodeURIComponent(symbol)}&max=8&reasons=${encodeURIComponent(reasonKeys)}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || !json?.ok) throw new Error(json?.error || "news failed");

        const items = (json.items ?? []) as NewsItem[];
        setNewsCache((p) => ({ ...p, [plain]: items }));
        analyzeWithGemini(symbol, items);
      } catch (e: any) {
        setNewsErrorFor((p) => ({ ...p, [plain]: e?.message ?? "Haber alınamadı" }));
        setNewsCache((p) => ({ ...p, [plain]: [] }));
      } finally {
        setNewsLoadingFor("");
      }
    },
    [analyzeWithGemini]
  );

  const toggleNewsForRow = useCallback(
    (row: { symbol: string; reasons?: string | null }) => {
      const plain = symbolToPlain(row.symbol);
      const willOpen = openNewsForSymbol !== plain;
      setOpenNewsForSymbol((cur) => (cur === plain ? "" : plain));
      if (willOpen) fetchNewsForSymbol(row.symbol, row.reasons ?? null);
    },
    [fetchNewsForSymbol, openNewsForSymbol]
  );

  function NewsBlock({
    symbol,
    isOpen,
    isLoading,
    error,
    items,
    onStopPropagation,
  }: {
    symbol: string;
    isOpen: boolean;
    isLoading: boolean;
    error?: string;
    items?: NewsItem[];
    onStopPropagation?: boolean;
  }) {
    if (!isOpen) return null;

    const safeItems = items ?? [];
    const plain = symbolToPlain(symbol);
    const smart = smartScore[plain];

    return (
      <div className="mt-3 pt-3 border-t border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">İlgili Haberler</div>
          <div className="text-[10px] text-gray-600 font-mono">{plain}</div>
        </div>

        <div className="mb-2">
          {smart ? (
            <div
              className={`text-[11px] px-2.5 py-2 rounded-lg border ${
                smart.score >= 4
                  ? "border-green-700 bg-green-950/30 text-green-200"
                  : smart.score <= -4
                  ? "border-red-700 bg-red-950/30 text-red-200"
                  : "border-gray-700 bg-gray-900/30 text-gray-200"
              }`}
              title={smart.explanation}
            >
              Smart News Score: <b>{smart.score}</b> / 10 • Impact: <b>{smart.impact}</b> — {smart.explanation}
            </div>
          ) : (
            <div className="text-[10px] text-gray-500">Smart News Score: (hazırlanıyor / yok)</div>
          )}
        </div>

        {isLoading ? (
          <div className="text-xs text-gray-500">Haberler yükleniyor...</div>
        ) : error ? (
          <div className="text-xs text-red-400">{error}</div>
        ) : safeItems.length === 0 ? (
          <div className="text-xs text-gray-500">Son günlerde uygun haber bulunamadı.</div>
        ) : (
          <div className="space-y-2">
            {safeItems.map((n, idx) => {
              const t = formatNewsTime(n.datetime);
              const matched = n.matched?.slice(0, 3) ?? [];
              return (
                <a
                  key={idx}
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-2 rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-gray-900/40 transition-colors"
                  onClick={(e) => {
                    if (onStopPropagation) e.stopPropagation();
                  }}
                  title={n.headline}
                >
                  <div className="text-xs text-gray-200 leading-snug line-clamp-2">{n.headline}</div>
                  <div className="mt-1 text-[10px] text-gray-500 flex gap-2 flex-wrap">
                    <span>{n.source || "News"}</span>
                    {t ? <span>• {t}</span> : null}
                    {typeof n.relevance === "number" ? <span>• rel:{n.relevance}</span> : null}
                  </div>

                  {matched.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {matched.map((m, j) => (
                        <span
                          key={j}
                          className="text-[9px] px-2 py-0.5 rounded-full border border-gray-700 bg-gray-900/40 text-gray-300"
                          title={m}
                        >
                          {m.split(":")[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // mini spark cache
  // ──────────────────────────────────────────────────
  const [miniCache, setMiniCache] = useState<Record<string, number[]>>({});
  const miniCacheRef = useRef<Record<string, number[]>>({});
  useEffect(() => {
    miniCacheRef.current = miniCache;
  }, [miniCache]);

  const fetchMini = useCallback(async (symbol: string) => {
    const plain = symbolToPlain(symbol);
    if (miniCacheRef.current[plain]) return;
    try {
      const res = await fetch(`/api/mini?symbol=${encodeURIComponent(symbol)}&n=30`);
      const json = await res.json();
      if (!res.ok || !json?.ok) return;
      const pts = Array.isArray(json?.points) ? (json.points as number[]) : [];
      setMiniCache((p) => ({ ...p, [plain]: pts }));
    } catch {}
  }, []);

  // ──────────────────────────────────────────────────
  // Sidebar
  // ──────────────────────────────────────────────────
  const SidebarContent = (
    <div className="h-full flex flex-col bg-[#0d1117]">
      <div className="p-5 border-b border-gray-800 bg-[#161b22]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-blue-500 tracking-tight italic">KUARK TERMINAL</h1>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/40" />
        </div>

        <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-widest">
          {totalAssetsCount} Assets • Live Alerts → TradingView
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setShowDashboard((v) => !v)}
            className={`text-[11px] px-3 py-1.5 rounded border transition-colors ${
              showDashboard
                ? "border-blue-500 bg-blue-900/20 text-blue-200"
                : "border-gray-700 hover:bg-gray-800 text-gray-200"
            }`}
            title="Dashboard panelini aç/kapat"
          >
            Dashboard: {showDashboard ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => {
              setHeatLimit((p) => Math.max(48, p));
              setSignalLimit(110);
              refreshAll();
            }}
            className="text-[11px] px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-800 text-gray-200"
            title="Paneli yenile"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex p-1.5 border-b border-gray-800">
        {(Object.keys(ASSETS_MAP) as AssetCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setSearchQuery("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded transition-colors ${
              activeCategory === cat
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
            }`}
            aria-label={`Kategori: ${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Sembol ara (örn. TSLA, BTC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b22] border border-gray-700 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
            aria-label="Sembol ara"
          />
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
        {filteredAssets.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">Sonuç bulunamadı.</div>
        ) : (
          filteredAssets.map((sym0) => {
            const sym = String(sym0);
            const full = `${prefixForSymbol(sym)}:${sym}`;
            const active = selectedSymbol === full;

            const hasSignal = signaledSymbols.has(sym);
            const last = lastSignalMap.get(sym);
            const plain = symbolToPlain(full);

            return (
              <button
                key={sym}
                onClick={() => {
                  setSelectedSymbol(full);
                  setSelectedSignalId(null);
                  setSidebarOpen(false);
                  setOpenNewsForSymbol("");
                  setMobileTab("CHART");
                  fetchMini(full);
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-800/30 transition-colors group ${
                  active
                    ? "bg-blue-900/10 border-l-4 border-blue-500"
                    : "hover:bg-gray-800/30 border-l-4 border-transparent"
                }`}
                aria-label={`Sembol seç: ${sym}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-left min-w-0">
                    <div className={`font-medium truncate ${active ? "text-blue-400" : "text-gray-200"}`}>{sym}</div>
                    <div className="text-[10px] text-gray-600 font-mono">{prefixForSymbol(sym)}</div>
                  </div>

                  {hasSignal && (
                    <div className="relative flex h-2 w-2 shrink-0" aria-label="Yeni sinyal var">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Sparkline points={miniCache[plain]} />

                  {last ? (
                    <span
                      className={`text-[10px] px-2 py-1 rounded border ${
                        String(last.signal).toUpperCase() === "BUY"
                          ? "border-green-700 text-green-200 bg-green-950/30"
                          : "border-red-700 text-red-200 bg-red-950/30"
                      }`}
                      title={`${String(last.signal).toUpperCase()} • ${last.score ?? "—"} • ${timeAgo(last.created_at)}`}
                    >
                      {String(last.signal).toUpperCase()} {last.score ?? "—"}
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(sym);
                    }}
                    className={`text-xs px-2 py-1 rounded border ${
                      isFav(sym)
                        ? "border-yellow-500 text-yellow-300 bg-yellow-900/20"
                        : "border-gray-700 text-gray-400 hover:text-gray-200"
                    }`}
                    title="Favorilere ekle/çıkar"
                    aria-label="Favori"
                  >
                    {isFav(sym) ? "★" : "☆"}
                  </button>

                  <span className={`text-xs ${active ? "text-blue-400" : "text-gray-600 group-hover:text-gray-400"}`}>
                    →
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const ms = marketStatusTRandUS();

  // ──────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#0d1117] text-white overflow-hidden font-sans">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-4/5 max-w-xs border-r border-gray-800 shadow-2xl">
            {SidebarContent}
          </div>
        </div>
      )}

      <div className="flex h-full">
        <aside className="hidden md:block w-80 border-r border-gray-800 overflow-hidden">{SidebarContent}</aside>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-[#161b22] border-b border-gray-800 z-10">
            <div className="flex items-center gap-4 min-w-0">
              <button
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-800/50 active:scale-95"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label="Open menu"
              >
                <HamburgerIcon open={sidebarOpen} />
              </button>

              <div className="min-w-0">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Terminal</div>
                <div className="text-xl font-black truncate">
                  {symbolToPlain(selectedSymbol)}
                  <span className="text-blue-500 text-sm ml-1.5">/ USD</span>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-2 text-[10px] text-gray-400">
                <span
                  className={`px-2 py-1 rounded border ${
                    ms.trOpen ? "border-green-700 text-green-300" : "border-gray-700 text-gray-400"
                  }`}
                  title="Yaklaşık seans göstergesi"
                >
                  TR {ms.trOpen ? "OPEN" : "CLOSED"}
                </span>
                <span
                  className={`px-2 py-1 rounded border ${
                    ms.usOpen ? "border-green-700 text-green-300" : "border-gray-700 text-gray-400"
                  }`}
                  title="Yaklaşık seans göstergesi"
                >
                  US {ms.usOpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={tvUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium px-3 py-1.5 border border-gray-700 rounded hover:bg-gray-800 transition-colors"
              >
                TradingView’de Aç
              </a>

              <button
                onClick={() => setOnlySelectedSymbol((v) => !v)}
                className={`text-xs font-medium px-3 py-1.5 border rounded transition-colors ${
                  onlySelectedSymbol
                    ? "border-blue-500 bg-blue-900/20 text-blue-200"
                    : "border-gray-700 hover:bg-gray-800 text-gray-200"
                }`}
                title="Sadece seçili sembolün sinyallerini göster"
              >
                {onlySelectedSymbol ? "Sembol: ON" : "Sembol: OFF"}
              </button>

              <button
                onClick={() => setAudioOn((v) => !v)}
                className={`text-xs font-medium px-3 py-1.5 border rounded transition-colors ${
                  audioOn
                    ? "border-yellow-500 bg-yellow-900/20 text-yellow-200"
                    : "border-gray-700 hover:bg-gray-800 text-gray-200"
                }`}
                title="Yeni sinyal gelince sesli uyarı"
              >
                Ses: {audioOn ? "ON" : "OFF"}
              </button>

              <button
                onClick={() => refreshAll()}
                className="text-xs font-medium px-3 py-1.5 border border-gray-700 rounded hover:bg-gray-800 transition-colors"
              >
                Yenile
              </button>
            </div>
          </header>

          {/* Mobile tabs */}
          <div className="md:hidden flex border-b border-gray-800 bg-[#161b22]">
            {(["DASH", "CHART", "SIGNALS"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setMobileTab(t)}
                className={`flex-1 py-3 text-xs font-bold ${
                  mobileTab === t ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"
                }`}
              >
                {t === "DASH" ? "DASH" : t === "CHART" ? "GRAFİK" : `SİNYALLER (${visibleSignals.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {showDashboard && (
              <section className={`${mobileTab !== "DASH" ? "hidden md:block" : "block"} border-b border-gray-800`}>
                <DashboardView
                  signals={dashSignals}
                  topBuy={todayTopBuy}
                  topSell={todayTopSell}
                  onSelectSymbol={(sym) => {
                    const ns = normalizeSymbol(sym);
                    setSelectedSymbol(ns);
                    setSelectedSignalId(null);
                    setMobileTab("CHART");
                    fetchMini(ns);
                  }}
                />

                <div className="px-4 md:px-8 pb-5">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="ml-auto">
                      {uiLoading ? "Yükleniyor..." : uiEmpty ? "Henüz veri yok." : `Sembol: ${dashSignals.length}`}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              <div
                className={`flex-1 flex flex-col bg-black min-w-0 min-h-[420px] ${
                  mobileTab !== "CHART" ? "hidden md:block" : "block"
                }`}
              >
                <div className="relative flex-1 min-h-[360px]">
                  <TradingViewWidget key={selectedSymbol} symbol={selectedSymbol} interval="D" theme="dark" />

                  {chartSignalPreview.length > 0 ? (
                    <div className="absolute left-3 top-3 flex flex-col gap-2">
                      {chartSignalPreview.map((r) => {
                        const sig = String(r.signal || "").toUpperCase();
                        const cls =
                          sig === "BUY"
                            ? "border-green-700 text-green-200 bg-green-950/60"
                            : sig === "SELL"
                            ? "border-red-700 text-red-200 bg-red-950/60"
                            : "border-gray-700 text-gray-200 bg-gray-900/60";
                        return (
                          <div
                            key={r.id}
                            className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-[10px] shadow-lg ${cls}`}
                            title={`${sig} • ${symbolToPlain(r.symbol)} • ${new Date(
                              r.created_at
                            ).toLocaleString("tr-TR")}`}
                          >
                            <span className="font-semibold">{sig}</span>
                            <span className="text-[10px] text-gray-300">{timeAgo(r.created_at)}</span>
                            {r.price != null && <span className="text-[10px] text-gray-300">@{r.price}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="absolute left-3 top-3 text-[11px] text-gray-500 bg-black/40 border border-gray-800 rounded px-2 py-1">
                      Bu sembol için sinyal bulunamadı.
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-800 bg-[#0b0f14] px-4 py-3">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>1G mum altında tetiklenen indikatör/formasyon etiketleri</span>
                    {chartSignalPreview[0] && <span>{timeAgo(chartSignalPreview[0].created_at)}</span>}
                  </div>

                  {chartSignalPreview.length > 0 ? (
                    <div className="mt-2 space-y-3">
                      {chartSignalPreview.map((signalRow) => (
                        <div key={signalRow.id} className="rounded-lg border border-gray-800 bg-[#0d1117] p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <ScoreChip signal={signalRow.signal} score={signalRow.score} />
                            <span className="text-xs text-gray-300">
                              {symbolToPlain(signalRow.symbol)} • {signalRow.signal || "—"}
                            </span>
                            <span className="text-xs text-gray-500">{timeAgo(signalRow.created_at)}</span>
                            {signalRow.price != null && (
                              <span className="text-xs text-gray-400">@{signalRow.price}</span>
                            )}
                          </div>
                          {signalRow.reasons ? (
                            <>
                              <ReasonBadges reasons={signalRow.reasons} />
                              <TechLine reasons={signalRow.reasons} />
                            </>
                          ) : (
                            <div className="mt-2 text-xs text-gray-500">Bu sinyal için etiket bilgisi gelmedi.</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">
                      Günlük mum altında gösterecek etiket bulunamadı.
                    </div>
                  )}
                </div>
              </div>

              <aside
                className={`md:w-96 w-full border-t md:border-t-0 md:border-l border-gray-800 bg-[#0b0f14] p-4 overflow-y-auto custom-scrollbar min-h-0 ${
                  mobileTab !== "SIGNALS" ? "hidden md:block" : "block"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wide">Son Sinyaller ({visibleSignals.length})</h2>
                    <div className="text-xs text-gray-400">{loadingSignals ? "Yükleniyor..." : uiEmpty ? "Boş" : "Canlı"}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 text-center">
                    <div className="text-xs uppercase tracking-widest text-gray-500 font-medium mb-1">Win Rate (manuel)</div>
                    <div className="text-3xl font-black text-white">{winrate == null ? "—" : `${winrate}%`}</div>
                    <div className="text-[10px] text-gray-500 mt-2">(Bu panel, şu an ekranda görünen sinyallere göre hesaplar)</div>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-800 bg-[#0d1117]">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="text-xs font-bold uppercase tracking-wide text-blue-300">🧠 AI Günlük Yorum (Top 5)</div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={runAiCommentary}
                          disabled={aiLoading}
                          className={`text-xs font-medium px-3 py-1.5 border rounded transition-colors ${
                            aiLoading ? "border-gray-700 text-gray-500" : "border-gray-700 hover:bg-gray-800 text-gray-200"
                          }`}
                        >
                          {aiLoading ? "Yorumlanıyor..." : "Yorumla"}
                        </button>

                        <button
                          onClick={copyAi}
                          disabled={!aiCommentary}
                          className={`text-xs font-medium px-3 py-1.5 border rounded transition-colors ${
                            aiCommentary ? "border-gray-700 hover:bg-gray-800 text-gray-200" : "border-gray-800 text-gray-600"
                          }`}
                        >
                          Kopyala
                        </button>
                      </div>
                    </div>

                    {aiError ? (
                      <div className="text-xs text-red-400">{aiError}</div>
                    ) : aiCommentary ? (
                      <div className="text-sm leading-relaxed text-gray-200 whitespace-pre-line">{aiCommentary}</div>
                    ) : (
                      <div className="text-xs text-gray-500">Top 5 listesi hazır olunca “Yorumla”ya bas.</div>
                    )}

                    <div className="text-[10px] text-gray-600 mt-3">Not: Yatırım tavsiyesi değildir.</div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Liste limiti: {signalLimit}</span>
                    <button
                      onClick={() => setSignalLimit((p) => Math.min(p + 110, 660))}
                      className="px-2 py-1 rounded border border-gray-700 hover:bg-gray-800"
                    >
                      Daha fazla
                    </button>
                  </div>

                  {loadingSignals ? (
                    <div className="space-y-3" aria-label="Sinyaller yükleniyor">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <SignalSkeleton key={i} />
                      ))}
                    </div>
                  ) : visibleSignals.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      {uiEmpty ? "Henüz sinyal üretilmedi." : "Filtreye göre sinyal yok."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleSignals.map((r: SignalRow) => {
                        const sig = String(r.signal || "").toUpperCase();
                        const isBuy = sig === "BUY";
                        const isSell = sig === "SELL";
                        const isActive = selectedSignalId === r.id;

                        const plain = symbolToPlain(r.symbol);
                        const open = openNewsForSymbol === plain;

                        const disableWin = r.outcome === "WIN";
                        const disableLoss = r.outcome === "LOSS";

                        return (
                          <button
                            key={r.id}
                            onClick={() => {
                              setSelectedSymbol(r.symbol);
                              setSelectedSignalId(r.id);
                              toggleNewsForRow({ symbol: r.symbol, reasons: r.reasons });
                              fetchMini(r.symbol);
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-blue-600/40 ${
                              isActive
                                ? "border-blue-600 bg-blue-950/30"
                                : "border-gray-800 bg-[#0d1117] hover:border-gray-700 hover:bg-gray-900/50"
                            }`}
                            aria-label={`Sinyal: ${sig} ${r.symbol}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className={`font-bold text-lg ${isBuy ? "text-green-400" : isSell ? "text-red-400" : "text-gray-200"}`}>
                                {sig}
                              </div>
                              <div className="text-xs text-gray-500">{timeAgo(r.created_at)}</div>
                            </div>

                            <div className="text-sm font-mono mb-1 text-gray-300">
                              {r.symbol} @ <span className="text-white">{r.price ?? "—"}</span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs text-gray-400">
                                Score: <span className="text-white">{r.score ?? "—"}</span>
                              </div>
                              <ScoreChip signal={r.signal} score={r.score} />
                            </div>

                            <ReasonBadges reasons={r.reasons} />
                            <TechLine reasons={r.reasons} />

                            <NewsBlock
                              symbol={r.symbol}
                              isOpen={open}
                              isLoading={newsLoadingFor === plain}
                              error={newsErrorFor[plain]}
                              items={newsCache[plain]}
                              onStopPropagation
                            />

                            <div className="mt-4 flex gap-2">
                              <button
                                disabled={disableWin}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!disableWin) setOutcome(r.id, "WIN");
                                }}
                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                  r.outcome === "WIN"
                                    ? "border-green-600 text-green-300 bg-green-950/30"
                                    : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500"
                                } ${disableWin ? "opacity-60 cursor-not-allowed" : ""}`}
                              >
                                WIN
                              </button>

                              <button
                                disabled={disableLoss}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!disableLoss) setOutcome(r.id, "LOSS");
                                }}
                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                  r.outcome === "LOSS"
                                    ? "border-red-600 text-red-300 bg-red-950/30"
                                    : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500"
                                } ${disableLoss ? "opacity-60 cursor-not-allowed" : ""}`}
                              >
                                LOSS
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOutcome(r.id, null);
                                }}
                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                  r.outcome === null
                                    ? "border-gray-600 text-gray-200 bg-gray-900/40"
                                    : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500"
                                }`}
                              >
                                Temizle
                              </button>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0d1117;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #21262d;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #30363d;
        }
      `}</style>
    </div>
  );
}
