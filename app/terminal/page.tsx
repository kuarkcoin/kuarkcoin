"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { useSignals, type SignalRow } from "@/hooks/useSignals";
import { reasonsToTechSentences } from "@/lib/reasonTranslator";
import { ASSETS, REASON_LABEL, parseReasons, symbolToPlain, timeAgo } from "@/constants/terminal";

// ── UI Bileşenleri ────────────────────────────────
function scoreBadge(signal: string | null | undefined, score: number | null | undefined) {
  const s = String(signal ?? "").toUpperCase();
  const sc = Number(score ?? 0);

  const strength = sc >= 25 ? "ÇOK GÜÇLÜ" : sc >= 18 ? "GÜÇLÜ" : sc >= 12 ? "ORTA" : "ZAYIF";

  if (s === "BUY") return `BUY • ${strength}`;
  if (s === "SELL") return `SELL • ${strength}`;
  return `${strength}`;
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
          className="text-[10px] px-2.5 py-1 rounded-full border border-gray-700 bg-gray-800/50 text-gray-200"
          title={key}
        >
          {REASON_LABEL[key] ?? key}
        </span>
      ))}
    </div>
  );
}

// ✅ Reasons -> otomatik teknik cümle
function TechLine({ reasons }: { reasons: string | null }) {
  const tech = reasonsToTechSentences(reasons);
  if (!tech) return null;

  return <div className="mt-2 text-[11px] leading-relaxed text-gray-300">{tech}</div>;
}

function ScoreChip({
  signal,
  score,
}: {
  signal: string | null | undefined;
  score: number | null | undefined;
}) {
  const text = scoreBadge(signal, score);
  if (!text) return null;

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

// ── News Types/UI ──────────────────────────────────
type NewsItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number; // unix sec
  summary?: string;
  relevance?: number;
  matched?: string[];
};

function formatNewsTime(unixSec?: number) {
  if (!unixSec) return "";
  try {
    return new Date(unixSec * 1000).toLocaleString("tr-TR");
  } catch {
    return "";
  }
}

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

  return (
    <div className="mt-3 pt-3 border-t border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">İlgili Haberler</div>
        <div className="text-[10px] text-gray-600 font-mono">{plain}</div>
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

export default function TerminalPage() {
  // ── core state ───────────────────────────────────
  const [selectedSymbol, setSelectedSymbol] = useState("NASDAQ:AAPL");
  const [activeCategory, setActiveCategory] = useState<keyof typeof ASSETS>("NASDAQ");
  const [searchQuery, setSearchQuery] = useState("");

  // mobil hamburger
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // signals panel selection
  const [selectedSignalId, setSelectedSignalId] = useState<number | null>(null);

  // ✅ seçili sembole göre filtre toggle
  const [onlySelectedSymbol, setOnlySelectedSymbol] = useState(false);

  // ✅ API + polling hook
  const { signals, loadingSignals, todayTopBuy, todayTopSell, refreshAll, setOutcome } = useSignals({
    pollMs: 300_000,
  });

  // ✅ Limit: panelde gerçekten son 110
  const LIMIT = 110;

  // ✅ Prefix (BIST dahil)
  const pickPrefix = useCallback((cat: keyof typeof ASSETS) => {
    return cat === "CRYPTO" ? "BINANCE" : cat === "ETF" ? "AMEX" : cat === "BIST" ? "BIST" : "NASDAQ";
  }, []);

  const filteredAssets = useMemo(() => {
    return ASSETS[activeCategory].filter((sym) => sym.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeCategory, searchQuery]);

  const signaledSymbols = useMemo(() => {
    return new Set(signals.map((r) => symbolToPlain(r.symbol)));
  }, [signals]);

  // ✅ Gösterilecek sinyaller: önce limit, sonra opsiyonel sembol filtresi
  const visibleSignals = useMemo(() => {
    const last = signals.slice(0, LIMIT); // API newest-first ise doğru
    if (!onlySelectedSymbol) return last;
    const plainSel = symbolToPlain(selectedSymbol);
    return last.filter((s) => symbolToPlain(s.symbol) === plainSel);
  }, [signals, selectedSymbol, onlySelectedSymbol]);

  const winrate = useMemo(() => {
    const decided = visibleSignals.filter((r) => r.outcome != null);
    if (decided.length === 0) return null;
    const wins = decided.filter((r) => r.outcome === "WIN").length;
    return Math.round((wins / decided.length) * 100);
  }, [visibleSignals]);

  // ✅ total asset count: BIST eklendi
  const totalAssetsCount =
    ASSETS.NASDAQ.length + ASSETS.ETF.length + ASSETS.CRYPTO.length + (ASSETS.BIST?.length ?? 0);

  const tvUrl = useMemo(() => {
    const s = encodeURIComponent(selectedSymbol);
    return `https://www.tradingview.com/chart/?symbol=${s}`;
  }, [selectedSymbol]);

  // ── 🧠 AI yorum state ────────────────────────────
  const [aiCommentary, setAiCommentary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  const runAiCommentary = useCallback(async () => {
    try {
      setAiLoading(true);
      setAiError("");

      // ✅ yeni endpoint: haber + risk + top5 digest
      const res = await fetch("/api/ai/daily-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topBuy: todayTopBuy,
          topSell: todayTopSell,
        }),
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

  // ── 📰 News state ────────────────────────────────
  const [newsLoadingFor, setNewsLoadingFor] = useState<string>(""); // plain symbol
  const [newsErrorFor, setNewsErrorFor] = useState<Record<string, string>>({});
  const [newsCache, setNewsCache] = useState<Record<string, NewsItem[]>>({});
  const [openNewsForSymbol, setOpenNewsForSymbol] = useState<string>(""); // plain symbol

  const newsCacheRef = useRef<Record<string, NewsItem[]>>({});
  useEffect(() => {
    newsCacheRef.current = newsCache;
  }, [newsCache]);

  const fetchNewsForSymbol = useCallback(async (symbol: string, reasons: string | null) => {
    const plain = symbolToPlain(symbol);

    // cache varsa tekrar çağırma
    if (newsCacheRef.current[plain]) return;

    const reasonKeys = parseReasons(reasons).join(",");

    try {
      setNewsLoadingFor(plain);
      setNewsErrorFor((p) => ({ ...p, [plain]: "" }));

      const url = `/api/news?symbol=${encodeURIComponent(symbol)}&max=8&reasons=${encodeURIComponent(reasonKeys)}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json?.ok) throw new Error(json?.error || "news failed");

      setNewsCache((p) => ({ ...p, [plain]: (json.items ?? []) as NewsItem[] }));
    } catch (e: any) {
      setNewsErrorFor((p) => ({ ...p, [plain]: e?.message ?? "Haber alınamadı" }));
      setNewsCache((p) => ({ ...p, [plain]: [] }));
    } finally {
      setNewsLoadingFor("");
    }
  }, []);

  const toggleNewsForRow = useCallback(
    (row: { symbol: string; reasons?: string | null }) => {
      const plain = symbolToPlain(row.symbol);
      setOpenNewsForSymbol((cur) => (cur === plain ? "" : plain));

      // sadece açılıyorsa fetch et
      const willOpen = openNewsForSymbol !== plain;
      if (willOpen) fetchNewsForSymbol(row.symbol, row.reasons ?? null);
    },
    [fetchNewsForSymbol, openNewsForSymbol]
  );

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
      </div>

      {/* Kategori */}
      <div className="flex p-1.5 border-b border-gray-800">
        {Object.keys(ASSETS).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat as any);
              setSearchQuery("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded transition-colors ${
              activeCategory === (cat as any)
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Arama */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Sembol ara (örn. TSLA, BTC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b22] border border-gray-700 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
          />
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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

      {/* Liste */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
        {filteredAssets.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">Sonuç bulunamadı.</div>
        ) : (
          filteredAssets.map((sym) => {
            const full = `${pickPrefix(activeCategory)}:${sym}`;
            const active = selectedSymbol === full;
            const hasSignal = signaledSymbols.has(sym);

            return (
              <button
                key={sym}
                onClick={() => {
                  setSelectedSymbol(full);
                  setSelectedSignalId(null);
                  setSidebarOpen(false);

                  // haber panelini seçili sembole geçir (istersen kapalı bırakalım; burada kapatıyorum)
                  setOpenNewsForSymbol("");
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-800/30 transition-colors group ${
                  active ? "bg-blue-900/10 border-l-4 border-blue-500" : "hover:bg-gray-800/30 border-l-4 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <div className={`font-medium ${active ? "text-blue-400" : "text-gray-200"}`}>{sym}</div>
                    <div className="text-[10px] text-gray-600 font-mono">{pickPrefix(activeCategory)}</div>
                  </div>

                  {hasSignal && (
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </div>
                  )}
                </div>

                <span className={`text-xs ${active ? "text-blue-400" : "text-gray-600 group-hover:text-gray-400"}`}>→</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[#0d1117] text-white overflow-hidden font-sans">
      {/* Mobil Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-4/5 max-w-xs border-r border-gray-800 shadow-2xl">{SidebarContent}</div>
        </div>
      )}

      <div className="flex h-full">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-80 border-r border-gray-800 overflow-hidden">{SidebarContent}</aside>

        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
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
            </div>

            <div className="flex items-center gap-2">
              <a
                href={tvUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium px-3 py-1.5 border border-gray-700 rounded hover:bg-gray-800 transition-colors"
                title="TradingView’de yeni sekmede aç"
              >
                TradingView’de Aç
              </a>

              <button
                onClick={() => setOnlySelectedSymbol((v) => !v)}
                className={`text-xs font-medium px-3 py-1.5 border rounded transition-colors ${
                  onlySelectedSymbol ? "border-blue-500 bg-blue-900/20 text-blue-200" : "border-gray-700 hover:bg-gray-800 text-gray-200"
                }`}
                title="Sadece seçili sembolün sinyallerini göster"
              >
                {onlySelectedSymbol ? "Sembol: ON" : "Sembol: OFF"}
              </button>

              <button
                onClick={() => {
                  refreshAll();
                  // istersen yenilede haber cache'i temizlenmesin; kalsın daha iyi.
                }}
                className="text-xs font-medium px-3 py-1.5 border border-gray-700 rounded hover:bg-gray-800 transition-colors"
              >
                Yenile
              </button>
            </div>
          </header>

          {/* Ana İçerik */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Grafik (TradingView) */}
            <div className="flex-1 relative bg-black min-w-0">
              <TradingViewWidget
  key={selectedSymbol}              // ✅ her sembolde widget komple yeniden kurulur
  symbol={selectedSymbol}
  interval="15"
  theme="dark"
/>
            </div>

            {/* Sinyaller Paneli */}
            <aside className="md:w-96 w-full border-t md:border-t-0 md:border-l border-gray-800 bg-[#0b0f14] p-4 overflow-y-auto custom-scrollbar min-h-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wide">Son Sinyaller ({visibleSignals.length})</h2>
                  <div className="text-xs text-gray-400">{loadingSignals ? "Yükleniyor..." : "Canlı"}</div>
                </div>

                {/* Winrate */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 text-center">
                  <div className="text-xs uppercase tracking-widest text-gray-500 font-medium mb-1">Win Rate (manuel)</div>
                  <div className="text-3xl font-black text-white">{winrate == null ? "—" : `${winrate}%`}</div>
                  <div className="text-[10px] text-gray-500 mt-2">(Bu panel, şu an ekranda görünen sinyallere göre hesaplar)</div>
                </div>

                {/* 🧠 AI Günlük Yorum */}
                <div className="p-4 rounded-xl border border-gray-800 bg-[#0d1117]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-wide text-blue-300">🧠 AI Günlük Yorum (Top 5)</div>

                    <button
                      onClick={runAiCommentary}
                      disabled={aiLoading}
                      className={`text-xs font-medium px-3 py-1.5 border rounded transition-colors ${
                        aiLoading ? "border-gray-700 text-gray-500" : "border-gray-700 hover:bg-gray-800 text-gray-200"
                      }`}
                      title="Top 5 BUY/SELL + Haber + Risk"
                    >
                      {aiLoading ? "Yorumlanıyor..." : "Yorumla"}
                    </button>
                  </div>

                  {aiError ? (
                    <div className="text-xs text-red-400">{aiError}</div>
                  ) : aiCommentary ? (
                    <div className="text-sm leading-relaxed text-gray-200 whitespace-pre-line">{aiCommentary}</div>
                  ) : (
                    <div className="text-xs text-gray-500">Top 5 listesi hazır olunca “Yorumla”ya bas.</div>
                  )}

                  <div className="text-[10px] text-gray-600 mt-3">
                    Not: Bu içerik yatırım tavsiyesi değildir; sinyal açıklamalarını + haber akışını özetler.
                  </div>
                </div>

                {/* Günlük Top 5 BUY/SELL */}
                <div className="grid grid-cols-1 gap-3">
                  {/* BUY */}
                  <div className="p-4 rounded-xl border border-gray-800 bg-[#0d1117]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-green-400">Günlük Top 5 BUY (Score)</div>
                      <div className="text-[10px] text-gray-500">{todayTopBuy.length}/5</div>
                    </div>

                    {todayTopBuy.length === 0 ? (
                      <div className="text-xs text-gray-500">{loadingSignals ? "Yükleniyor..." : "Bugün BUY yok."}</div>
                    ) : (
                      <div className="space-y-2">
                        {todayTopBuy.map((r) => {
                          const plain = symbolToPlain(r.symbol);
                          const open = openNewsForSymbol === plain;

                          return (
                            <button
                              key={`topbuy-${r.id}`}
                              onClick={() => {
                                setSelectedSymbol(r.symbol);
                                setSelectedSignalId(r.id);
                                setSidebarOpen(false);
                                toggleNewsForRow({ symbol: r.symbol, reasons: r.reasons });
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-gray-900/40 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs font-mono text-gray-300 truncate">{r.symbol}</div>
                                  <div className="text-[10px] text-gray-600">
                                    {timeAgo(r.created_at)} • {r.price ?? "—"}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <div className="text-sm font-black text-white">{r.score ?? "—"}</div>
                                  <ScoreChip signal={r.signal} score={r.score} />
                                </div>
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
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SELL */}
                  <div className="p-4 rounded-xl border border-gray-800 bg-[#0d1117]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-red-400">Günlük Top 5 SELL (Score)</div>
                      <div className="text-[10px] text-gray-500">{todayTopSell.length}/5</div>
                    </div>

                    {todayTopSell.length === 0 ? (
                      <div className="text-xs text-gray-500">{loadingSignals ? "Yükleniyor..." : "Bugün SELL yok."}</div>
                    ) : (
                      <div className="space-y-2">
                        {todayTopSell.map((r) => {
                          const plain = symbolToPlain(r.symbol);
                          const open = openNewsForSymbol === plain;

                          return (
                            <button
                              key={`topsell-${r.id}`}
                              onClick={() => {
                                setSelectedSymbol(r.symbol);
                                setSelectedSignalId(r.id);
                                setSidebarOpen(false);
                                toggleNewsForRow({ symbol: r.symbol, reasons: r.reasons });
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-gray-900/40 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs font-mono text-gray-300 truncate">{r.symbol}</div>
                                  <div className="text-[10px] text-gray-600">
                                    {timeAgo(r.created_at)} • {r.price ?? "—"}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <div className="text-sm font-black text-white">{r.score ?? "—"}</div>
                                  <ScoreChip signal={r.signal} score={r.score} />
                                </div>
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
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Signals list */}
                {loadingSignals ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SignalSkeleton key={i} />
                    ))}
                  </div>
                ) : visibleSignals.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">Henüz sinyal yok.</div>
                ) : (
                  <div className="space-y-3">
                    {visibleSignals.map((r: SignalRow) => {
                      const sig = String(r.signal || "").toUpperCase();
                      const isBuy = sig === "BUY";
                      const isSell = sig === "SELL";
                      const isActive = selectedSignalId === r.id;

                      const plain = symbolToPlain(r.symbol);
                      const open = openNewsForSymbol === plain;

                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedSymbol(r.symbol);
                            setSelectedSignalId(r.id);
                            toggleNewsForRow({ symbol: r.symbol, reasons: r.reasons });
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            isActive
                              ? "border-blue-600 bg-blue-950/30"
                              : "border-gray-800 bg-[#0d1117] hover:border-gray-700 hover:bg-gray-900/50"
                          }`}
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

                          {/* Outcome */}
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOutcome(r.id, "WIN");
                              }}
                              className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                r.outcome === "WIN"
                                  ? "border-green-600 text-green-400 bg-green-950/30"
                                  : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500"
                              }`}
                            >
                              WIN
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOutcome(r.id, "LOSS");
                              }}
                              className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                r.outcome === "LOSS"
                                  ? "border-red-600 text-red-400 bg-red-950/30"
                                  : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500"
                              }`}
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