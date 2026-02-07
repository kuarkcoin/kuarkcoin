// app/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import DailyTopBuyTracker from "@/components/DailyTopBuyTracker";

// =====================
// TYPES
// =====================
type SignalRow = {
  id: number;
  created_at: string;
  symbol: string;
  signal: string; // BUY | SELL
  price: number | null;
  score: number | null; // 0..100
  reasons: string | null;
};

type KapRow = {
  title: string;
  url: string;
  source: string;
  datetime: number; // unix sec
  company?: string;
  tags: string[];
  stockCodes: string[];
};

type NewsItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number; // unix sec
  tickers: string[];
  tags: string[];
  // opsiyonel alanlar varsa zarar vermez
  score?: number;
};

type TopMarginRow = {
  symbol: string;
  finnhubSymbol?: string;
  grossMargin?: number | null;
  netMargin?: number | null;
  period?: "TTM" | "FY" | "UNKNOWN";
  grossSeries?: number[];
  netSeries?: number[];
  qualityScore?: number;
  volatility?: number;
};

type TopMarginsResp = {
  universe: string;
  updatedAt?: string;
  periodHint?: string;
  topNet: TopMarginRow[];
  topGross: TopMarginRow[];
  topQuality: TopMarginRow[];
};

const ALLOWED_UNIVERSE = ["BIST100", "NASDAQ300", "ETF"] as const;
type Universe = (typeof ALLOWED_UNIVERSE)[number];

// =====================
// HELPERS
// =====================
function getApiBaseUrl() {
  // Vercel / Prod: en sağlamı env ile sabitlemek
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (env) return env;

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function safeHttpUrl(u: string | null | undefined) {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function safeFetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
  if (!res.ok) {
    return { __error: true, status: res.status, url } as const;
  }
  const json = await res.json().catch(() => null);
  return json;
}

async function safeFetchJsonCached(url: string, revalidate: number) {
  const res = await fetch(url, { cache: "force-cache", next: { revalidate } });
  if (!res.ok) {
    return { __error: true, status: res.status, url } as const;
  }
  const json = await res.json().catch(() => null);
  return json;
}

function symbolToPlain(sym: string) {
  return sym?.includes(":") ? sym.split(":")[1] : sym;
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] px-2.5 py-1 rounded-full border border-gray-800 bg-[#0b0f14] text-gray-200">
      {children}
    </span>
  );
}

function parseReasons(reasons: string | null): string[] {
  if (!reasons) return [];
  return reasons
    .split(/[,;|\n]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function formatPrice(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const decimals = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

function fmtPct(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n) + "%";
}

function formatDateTR(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function timeAgoTR(unixSec?: number) {
  if (!unixSec) return "—";
  const now = Date.now();
  const t = unixSec * 1000;
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  return `${d} gün önce`;
}

function Sparkline({ values }: { values?: number[] }) {
  const v = (values ?? []).filter((x) => Number.isFinite(x));
  if (v.length < 2) return <span className="text-[11px] text-gray-600">—</span>;

  const trendUp = v[v.length - 1] >= v[0];

  const w = 90,
    h = 24,
    pad = 2;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const span = max - min || 1;

  const pts = v.map((x, i) => {
    const px = pad + (i * (w - pad * 2)) / (v.length - 1);
    const py = pad + (1 - (x - min) / span) * (h - pad * 2);
    return [px, py] as const;
  });

  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={`opacity-95 ${trendUp ? "text-green-400" : "text-red-400"}`}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function tagLabel(tag: string) {
  const t = String(tag || "").toUpperCase();
  if (t === "IS_ANLASMASI") return "🟢 İş Anlaşması";
  if (t === "SATIN_ALMA") return "🚀 Satın Alma";
  if (t === "BIRLESME") return "🔥 Birleşme/Bölünme";
  if (t === "YUKSEK_KAR") return "💰 Yüksek Kâr/Bilanço";
  if (t === "TEMETTU") return "🟦 Temettü";
  if (t === "GERI_ALIM") return "🟣 Geri Alım";
  if (t === "NEGATIF") return "🔴 Negatif";
  return "📌 Diğer";
}

function cleanTickerLabel(t: string) {
  return t?.includes(":") ? t.split(":")[1] : t;
}

function universeLabel(u: Universe) {
  if (u === "NASDAQ300") return "NASDAQ • 300";
  if (u === "ETF") return "ETF";
  return "BIST100";
}

// Investing-style: score badge + bar
function scoreTone(scoreNum: number | null) {
  if (scoreNum == null) return "bg-gray-900/40 text-gray-200 border-gray-700";
  if (scoreNum >= 80) return "bg-green-500/15 text-green-300 border-green-600 shadow-green-500/30 shadow-sm";
  if (scoreNum >= 60) return "bg-yellow-500/15 text-yellow-300 border-yellow-600 shadow-yellow-500/20 shadow-sm";
  return "bg-red-500/15 text-red-300 border-red-600 shadow-red-500/20 shadow-sm";
}

function ScoreBadge({ score }: { score: number | null }) {
  return (
    <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${scoreTone(score)}`}>
      {score ?? "—"}
    </span>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  const s = score == null ? 0 : Math.max(0, Math.min(100, score));
  const fill =
    score == null ? "bg-gray-700" : s >= 80 ? "bg-green-500" : s >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-1.5 ${fill}`} style={{ width: `${s}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-gray-500">Heat: {score == null ? "—" : `${s}/100`}</div>
    </div>
  );
}

function newsImpactColor(tags: string[]) {
  const u = (tags ?? []).map((x) => String(x).toUpperCase());
  if (u.includes("NEGATIF")) return "border-red-600/70 bg-red-950/20";
  if (u.includes("SATIN_ALMA") || u.includes("BIRLESME")) return "border-green-600/70 bg-green-950/15";
  if (u.includes("TEMETTU") || u.includes("GERI_ALIM")) return "border-blue-600/70 bg-blue-950/15";
  if (u.includes("YUKSEK_KAR")) return "border-yellow-600/70 bg-yellow-950/10";
  return "border-gray-800 bg-[#0b0f14]";
}

function estimateNewsImpact(n: NewsItem) {
  // Basit “impact score” (0..100): ticker sayısı + tag ağırlığı + kaynak bonusu
  const tick = (n.tickers ?? []).length;
  const tags = (n.tags ?? []).map((x) => String(x).toUpperCase());
  let score = 10;

  score += Math.min(30, tick * 6);

  if (tags.includes("SATIN_ALMA") || tags.includes("BIRLESME")) score += 25;
  if (tags.includes("TEMETTU") || tags.includes("GERI_ALIM")) score += 18;
  if (tags.includes("YUKSEK_KAR")) score += 14;
  if (tags.includes("NEGATIF")) score += 16;

  const src = String(n.source || "").toLowerCase();
  if (src.includes("reuters") || src.includes("bloomberg")) score += 10;

  if (typeof n.score === "number") score = Math.max(score, Math.min(100, n.score));

  return Math.max(0, Math.min(100, score));
}

// =====================
// DATA FETCHERS
// =====================
async function getLatestSignals(base: string): Promise<SignalRow[]> {
  try {
    const json: any = await safeFetchJson(`${base}/api/signals`);
    const arr: SignalRow[] = (json?.data ?? []) as SignalRow[];
    return Array.isArray(arr) ? arr.slice(0, 6) : [];
  } catch (e) {
    console.error("getLatestSignals error:", e);
    return [];
  }
}

async function getKapImportant(base: string): Promise<KapRow[]> {
  try {
    const json: any = await safeFetchJson(`${base}/api/kap/bist100-important?mode=strict`);
    const arr: KapRow[] = (json?.items ?? []) as KapRow[];
    return Array.isArray(arr) ? arr.slice(0, 8) : [];
  } catch (e) {
    console.error("getKapImportant error:", e);
    return [];
  }
}

async function getTopMargins(base: string, universe: Universe): Promise<TopMarginsResp | null> {
  if (universe === "ETF") return null;

  try {
    const backendUniverse = universe === "NASDAQ300" ? "NASDAQ100" : universe;
    const url = `${base}/api/financials/top-margins?universe=${encodeURIComponent(backendUniverse)}&limit=10`;
    const json: any = await safeFetchJson(url);
    const data = (json?.data ?? null) as TopMarginsResp | null;
    return data && typeof data === "object" ? data : null;
  } catch (e) {
    console.error("getTopMargins error:", e);
    return null;
  }
}

async function getNewsCombined(
  base: string,
  universe: Universe,
  minScore: number
): Promise<{ items: NewsItem[]; meta?: any; debug?: any }> {
  try {
    // Not: ilk debug için minScore'u query ile oynatacağız
    const url = `${base}/api/news/combined?u=${encodeURIComponent(universe)}&limit=30&minScore=${minScore}`;
    const json: any = await safeFetchJsonCached(url, 3600);

    // hata objesi döndüyse
    if (json?.__error) {
      return { items: [], debug: json };
    }

    const arr: NewsItem[] = (json?.items ?? []) as NewsItem[];
    return { items: Array.isArray(arr) ? arr : [], meta: json?.meta, debug: { url, status: 200 } };
  } catch (e) {
    console.error("getNewsCombined error:", e);
    return { items: [], debug: { error: String(e) } };
  }
}

// =====================
// PAGE
// =====================
export default async function HomePage({
  searchParams,
}: {
  searchParams?: { u?: string; t?: string; sort?: string; minScore?: string };
}) {
  const u = String(searchParams?.u ?? "BIST100").toUpperCase();
  const universe: Universe = (ALLOWED_UNIVERSE as readonly string[]).includes(u) ? (u as Universe) : "BIST100";

  // ticker filter
  const tickerFilter = (searchParams?.t ?? "").toString().trim().toUpperCase();

  // sorting: latest | impact
  const sort = (searchParams?.sort ?? "latest").toString().toLowerCase();

  // debug: minScore override (default 80)
  const minScore = Number.isFinite(Number(searchParams?.minScore))
    ? Math.max(0, Math.min(100, Number(searchParams?.minScore)))
    : 80;

  const base = getApiBaseUrl();

  const [latest, kap, top, newsPack] = await Promise.all([
    getLatestSignals(base),
    universe === "BIST100" ? getKapImportant(base) : Promise.resolve([]),
    getTopMargins(base, universe),
    getNewsCombined(base, universe, minScore),
  ]);

  let news = newsPack.items;

  // ticker filter applied
  if (tickerFilter) {
    news = news.filter((n) => (n.tickers ?? []).some((t) => cleanTickerLabel(t).toUpperCase() === tickerFilter));
  }

  // sort
  if (sort === "impact") {
    news = [...news].sort((a, b) => estimateNewsImpact(b) - estimateNewsImpact(a));
  } else {
    news = [...news].sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
  }

  const defaultSym = latest?.[0]?.symbol ? symbolToPlain(latest[0].symbol) : "BIMAS";
  const nowIso = new Date().toISOString();

  const newsCount = news.length;
  const lastNewsTimeIso = newsCount ? new Date(news[0].datetime * 1000).toISOString() : null;

  return (
    <main className="min-h-screen bg-[#0d1117] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-[#0d1117]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/40" />
            <span className="font-black tracking-tight italic text-blue-500">KUARK</span>
            <span className="text-xs text-gray-500">Market Terminal</span>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/terminal"
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-900 transition-colors"
            >
              Terminal
            </Link>
            <a
              href="#how"
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-900 transition-colors"
            >
              Nasıl Çalışır?
            </a>
          </nav>
        </div>

        {/* Market pulse strip */}
        <div className="border-t border-gray-800 bg-[#0b0f14]">
          <div className="mx-auto max-w-6xl px-4 py-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
            <span className="px-2 py-1 rounded-full border border-gray-800 bg-[#0d1117]">
              Universe: <span className="text-gray-200 font-semibold">{universeLabel(universe)}</span>
            </span>
            <span className="px-2 py-1 rounded-full border border-gray-800 bg-[#0d1117]">
              Haber: <span className="text-gray-200 font-semibold">{newsCount}</span>
              {lastNewsTimeIso ? (
                <span className="text-gray-500"> • son: {timeAgoTR(news[0].datetime)}</span>
              ) : null}
            </span>
            <span className="px-2 py-1 rounded-full border border-gray-800 bg-[#0d1117]">
              MinScore: <span className="text-gray-200 font-semibold">{minScore}</span>
            </span>
            {tickerFilter ? (
              <span className="px-2 py-1 rounded-full border border-blue-700/60 bg-blue-950/30 text-blue-200">
                Ticker: <span className="font-black">{tickerFilter}</span>{" "}
                <Link
                  href={`/?u=${encodeURIComponent(universe)}&sort=${encodeURIComponent(sort)}&minScore=${minScore}`}
                  className="ml-1 text-blue-300 hover:text-blue-200 underline"
                >
                  temizle
                </Link>
              </span>
            ) : null}
            <span className="px-2 py-1 rounded-full border border-gray-800 bg-[#0d1117]">
              Render: <span className="text-gray-200 font-semibold">{formatDateTR(nowIso)}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8">
        <div className="rounded-3xl border border-gray-800 bg-gradient-to-br from-[#111827] via-[#0d1117] to-black p-8 md:p-12 shadow-2xl">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge>Live Alerts</Badge>
              <Badge>BUY / SELL Score</Badge>
              <Badge>NASDAQ • ETF • CRYPTO</Badge>
              <Badge>Custom Chart</Badge>
              <Badge>KAP • BIST100</Badge>
              <Badge>News Catcher</Badge>
              <Badge>Top Margins</Badge>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Canlı Sinyal Terminali: <span className="text-blue-500">KUARK</span>
            </h1>

            <p className="text-gray-300 max-w-2xl leading-relaxed">
              Pine Script alarmından gelen sinyalleri toplayıp tek ekranda gösterir: skor, nedenler, Win/Loss takibi ve
              grafikte işaretleme. Ek olarak ana sayfada BIST100 için yükseltici KAP bildirimlerini etiketleyip özetler.
              Yeni: Haber yakalayıcı (BIST100 / NASDAQ300 / ETF) + marj sıralamaları.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/terminal"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-bold"
              >
                Terminale Git →
              </Link>

              <Link
                href={`/bilanco?symbol=${encodeURIComponent(defaultSym)}`}
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-700 hover:bg-gray-900 transition-colors font-semibold text-gray-200"
              >
                Bilanço →
              </Link>

              {/* Quick debug link */}
              <Link
                href={`/?u=${encodeURIComponent(universe)}&minScore=0&sort=impact`}
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-700 hover:bg-gray-900 transition-colors font-semibold text-gray-200"
              >
                Debug: minScore=0 →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="text-sm font-bold">⚡ Canlı Akış</div>
                <div className="text-xs text-gray-500 mt-1">API’dan son sinyaller çekilir, terminalde otomatik yenilenir.</div>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="text-sm font-bold">🧠 Skor + Neden</div>
                <div className="text-xs text-gray-500 mt-1">Golden Cross, VWAP, Divergence… skor bar + glow ile.</div>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="text-sm font-bold">🗞️ Haber Yakala</div>
                <div className="text-xs text-gray-500 mt-1">
                  Haber metninden tickers yakalanır: <span className="text-gray-300">{universeLabel(universe)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Universe switch + controls */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-black">🌍 Universe</div>

          <div className="flex flex-wrap items-center gap-2">
            {(["BIST100", "NASDAQ300", "ETF"] as Universe[]).map((x) => {
              const active = universe === x;
              return (
                <Link
                  key={x}
                  href={`/?u=${x}&sort=${encodeURIComponent(sort)}&minScore=${minScore}${tickerFilter ? `&t=${encodeURIComponent(tickerFilter)}` : ""}`}
                  aria-current={active ? "page" : undefined}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                    active
                      ? "border-blue-500 bg-blue-950/40 text-blue-200 shadow-blue-500/30 shadow-sm"
                      : "border-gray-700 hover:bg-gray-900 text-gray-200"
                  }`}
                >
                  {x}
                </Link>
              );
            })}

            <div className="w-px h-7 bg-gray-800 mx-1" />

            <Link
              href={`/?u=${encodeURIComponent(universe)}&sort=latest&minScore=${minScore}${tickerFilter ? `&t=${encodeURIComponent(tickerFilter)}` : ""}`}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
                sort === "latest" ? "border-gray-200/30 bg-gray-900/40 text-gray-100" : "border-gray-700 hover:bg-gray-900 text-gray-200"
              }`}
            >
              Sırala: Son
            </Link>
            <Link
              href={`/?u=${encodeURIComponent(universe)}&sort=impact&minScore=${minScore}${tickerFilter ? `&t=${encodeURIComponent(tickerFilter)}` : ""}`}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
                sort === "impact" ? "border-gray-200/30 bg-gray-900/40 text-gray-100" : "border-gray-700 hover:bg-gray-900 text-gray-200"
              }`}
            >
              Sırala: Etki
            </Link>
          </div>
        </div>
      </section>

      {/* News feed */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-lg font-black">🔥 Haber Akışı</h2>
          <span className="text-xs text-gray-500">
            Render: {formatDateTR(nowIso)} • Kaynak cache: 1 saat
          </span>
        </div>

        {news.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-6 text-gray-300 text-sm">
            <div className="font-black">Haber yok / gelmiyor</div>
            <div className="mt-2 text-xs text-gray-400 leading-relaxed">
              • Eğer <b>minScore</b> yüksekse (şu an: <b>{minScore}</b>) haberler filtrelenebilir.{" "}
              <Link
                className="text-blue-300 hover:text-blue-200 underline"
                href={`/?u=${encodeURIComponent(universe)}&minScore=0&sort=${encodeURIComponent(sort)}`}
              >
                minScore=0 dene
              </Link>
              <br />
              • Endpoint: <code className="text-gray-200">/api/news/combined</code>
              <br />
              • Debug:{" "}
              <span className="text-gray-200">
                {newsPack?.debug?.status ? `status=${newsPack.debug.status}` : "status=—"}
              </span>{" "}
              {newsPack?.debug?.url ? (
                <>
                  • url: <span className="text-gray-500 break-all">{newsPack.debug.url}</span>
                </>
              ) : null}
              {newsPack?.debug?.error ? (
                <>
                  <br />• error: <span className="text-red-300">{String(newsPack.debug.error)}</span>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {news.map((n, i) => {
              const href = safeHttpUrl(n.url);
              const dateIso = n.datetime ? new Date(n.datetime * 1000).toISOString() : "";
              const tick = (n.tickers || []).slice(0, 6);
              const tags = (n.tags || []).slice(0, 4);
              const impact = estimateNewsImpact(n);

              const Card = (
                <div className={`rounded-2xl border p-4 hover:bg-[#0f1620] transition-colors ${newsImpactColor(tags)}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-gray-400">
                      <span className="text-gray-300">{n.source}</span> • {dateIso ? formatDateTR(dateIso) : "—"} •{" "}
                      <span className="text-gray-500">{timeAgoTR(n.datetime)}</span>
                    </div>

                    <ScoreBadge score={impact} />
                  </div>

                  <div className="mt-1 font-black text-sm">{n.headline}</div>

                  <ScoreBar score={impact} />

                  {tick.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tick.map((t) => {
                        const plain = cleanTickerLabel(t).toUpperCase();
                        return (
                          <Link
                            key={t}
                            href={`/?u=${encodeURIComponent(universe)}&t=${encodeURIComponent(plain)}&sort=${encodeURIComponent(sort)}&minScore=${minScore}`}
                            className="text-[11px] px-2 py-1 rounded-full border border-gray-800 bg-[#0d1117] text-gray-300 hover:border-blue-600/60 hover:text-blue-200 transition-colors"
                            aria-label={`Ticker filtrele: ${plain}`}
                          >
                            {plain}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}

                  {tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2 py-1 rounded-full border border-gray-800 bg-[#0d1117] text-gray-300"
                        >
                          {tagLabel(t)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 text-xs text-blue-400">{href ? "Haberi aç →" : "Link geçersiz"}</div>
                </div>
              );

              if (!href) return <div key={`${n.url}-${i}`}>{Card}</div>;

              return (
                <a key={`${href}-${i}`} href={href} target="_blank" rel="noreferrer" className="block">
                  {Card}
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* High margin ranking (hidden for ETF) */}
      {universe !== "ETF" ? (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-lg font-black">💰 Yüksek Kâr Oranı</h2>
            <div className="text-xs text-gray-500">
              Universe: <span className="text-gray-200 font-semibold">{universeLabel(universe)}</span>
              {universe === "NASDAQ300" ? <span className="text-gray-600"> • (marjlar NASDAQ100’den)</span> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4 mb-3">
            <div className="text-sm font-bold">“Yüksek kâr oranı” ne demek?</div>
            <div className="text-xs text-gray-400 mt-1 leading-relaxed">
              • <b>Brüt Kâr Marjı</b>: satış kârlılığı. <br />
              • <b>Net Kâr Marjı</b>: tüm giderler + finansman + vergi sonrası gerçek kârlılık.{" "}
              <span className="text-gray-500">(Aşırı yüksek net marj bazen tek seferlik gelirlerden şişebilir.)</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              Son güncelleme: {top?.updatedAt ? formatDateTR(top.updatedAt) : "—"} • Periyot: {top?.periodHint ?? "—"}
            </div>
          </div>

          {!top || (top.topNet?.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-6 text-gray-400 text-sm">
              Marj sıralaması boş (veya <code className="text-gray-300">/api/financials/top-margins</code> erişilemiyor).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Net */}
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="font-black text-sm">🏆 Net Kâr Marjı</div>
                <div className="mt-3 space-y-2">
                  {top.topNet.map((r, i) => (
                    <Link
                      key={`net-${r.symbol}`}
                      href={`/bilanco?symbol=${encodeURIComponent(r.symbol)}`}
                      className="flex items-center justify-between rounded-xl border border-gray-800 bg-[#0d1117] px-3 py-2 hover:bg-[#0f1620] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">
                          {i + 1}. {r.symbol}
                        </div>
                        <div className="text-sm font-black text-green-300">{fmtPct(r.netMargin)}</div>
                      </div>
                      <div className="text-gray-400">
                        <Sparkline values={r.netSeries ?? []} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Gross */}
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="font-black text-sm">🏆 Brüt Kâr Marjı</div>
                <div className="mt-3 space-y-2">
                  {top.topGross.map((r, i) => (
                    <Link
                      key={`gross-${r.symbol}`}
                      href={`/bilanco?symbol=${encodeURIComponent(r.symbol)}`}
                      className="flex items-center justify-between rounded-xl border border-gray-800 bg-[#0d1117] px-3 py-2 hover:bg-[#0f1620] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">
                          {i + 1}. {r.symbol}
                        </div>
                        <div className="text-sm font-black text-blue-300">{fmtPct(r.grossMargin)}</div>
                      </div>
                      <div className="text-gray-400">
                        <Sparkline values={r.grossSeries ?? []} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="font-black text-sm">💎 Kaliteli Kâr</div>
                <div className="text-[11px] text-gray-500 mt-1">Stabil + trend bonus (dalgalanma cezası ile)</div>
                <div className="mt-3 space-y-2">
                  {top.topQuality.map((r, i) => (
                    <Link
                      key={`q-${r.symbol}`}
                      href={`/bilanco?symbol=${encodeURIComponent(r.symbol)}`}
                      className="flex items-center justify-between rounded-xl border border-gray-800 bg-[#0d1117] px-3 py-2 hover:bg-[#0f1620] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">
                          {i + 1}. {r.symbol}
                        </div>
                        <div className="text-xs text-gray-300">
                          Net: <span className="font-bold text-green-300">{fmtPct(r.netMargin)}</span> • Brüt:{" "}
                          <span className="font-bold text-blue-300">{fmtPct(r.grossMargin)}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Skor: <span className="text-gray-200 font-semibold">{r.qualityScore ?? "—"}</span>
                          {r.volatility != null ? ` • Vol: ${Number(r.volatility).toFixed(2)}` : ""}
                        </div>
                      </div>
                      <div className="text-gray-400">
                        <Sparkline values={(r.netSeries?.length ? r.netSeries : r.grossSeries) ?? []} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* KAP Important (only meaningful for BIST100) */}
      {universe === "BIST100" ? (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-lg font-black">KAP • BIST100 Önemli</h2>
            <span className="text-xs text-gray-500">Render: {formatDateTR(nowIso)}</span>
          </div>

          {kap.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-6 text-gray-400 text-sm">
              Şu an yükseltici KAP haberi yok (veya <code className="text-gray-300">/api/kap/bist100-important</code>{" "}
              erişilemiyor).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {kap.map((k, i) => {
                const href = safeHttpUrl(k.url);
                const dateIso = k.datetime ? new Date(k.datetime * 1000).toISOString() : "";
                const codes = Array.isArray(k.stockCodes) ? k.stockCodes : [];
                const tags = Array.isArray(k.tags) ? k.tags.slice(0, 3) : [];

                const Card = (
                  <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4 hover:bg-[#0f1620] transition-colors">
                    <div className="text-xs text-gray-500">
                      {(codes.length ? codes.join(", ") : "—")} • {dateIso ? formatDateTR(dateIso) : "—"} •{" "}
                      <span className="text-gray-600">{timeAgoTR(k.datetime)}</span>
                    </div>

                    <div className="mt-1 font-black text-sm">{k.title ?? "KAP Bildirimi"}</div>

                    {tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className={`text-[11px] px-2 py-1 rounded-full border bg-[#0d1117] ${
                              String(t).toUpperCase() === "NEGATIF"
                                ? "border-red-600/60 text-red-300"
                                : String(t).toUpperCase() === "SATIN_ALMA"
                                ? "border-green-600/60 text-green-300"
                                : String(t).toUpperCase() === "TEMETTU"
                                ? "border-blue-600/60 text-blue-300"
                                : "border-gray-800 text-gray-300"
                            }`}
                          >
                            {tagLabel(t)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {href ? <div className="mt-3 text-xs text-blue-400">KAP’ta aç →</div> : null}
                  </div>
                );

                if (!href) return <div key={`kap-${i}`}>{Card}</div>;

                return (
                  <a key={`kap-${i}`} href={href} target="_blank" rel="noreferrer" className="block">
                    {Card}
                  </a>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Latest signals */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-lg font-black">Son Sinyaller</h2>
          <Link href="/terminal" className="text-sm text-blue-400 hover:text-blue-300">
            Tümünü Terminalde aç →
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-6 text-gray-400 text-sm">
            Henüz sinyal yok (veya <code className="text-gray-300">/api/signals</code> erişilemiyor).
            <div className="mt-2 text-xs text-gray-600">Render: {formatDateTR(nowIso)}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {latest.map((r) => {
              const sig = String(r.signal || "").toUpperCase();
              const isBuy = sig === "BUY";
              const isSell = sig === "SELL";
              const plain = symbolToPlain(r.symbol);
              const reasons = parseReasons(r.reasons);
              const scoreNum = typeof r.score === "number" ? r.score : null;

              return (
                <Link
                  key={r.id}
                  href={`/terminal?focus=${encodeURIComponent(String(r.id))}`}
                  className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4 hover:bg-[#0f1620] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Sembol</div>
                      <div className="text-base font-black truncate">{plain}</div>
                      <div className="text-xs text-gray-600 mt-0.5 truncate">
                        {formatDateTR(r.created_at)} • {r.symbol}
                      </div>
                    </div>

                    <div
                      className={`shrink-0 text-xs font-black px-2.5 py-1 rounded-lg border ${
                        isBuy
                          ? "border-green-600 text-green-300 bg-green-950/30 shadow-green-500/20 shadow-sm"
                          : isSell
                          ? "border-red-600 text-red-300 bg-red-950/30 shadow-red-500/20 shadow-sm"
                          : "border-gray-700 text-gray-300 bg-gray-900/30"
                      }`}
                    >
                      {sig || "—"}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-200">
                      Fiyat: <span className="font-bold text-white">{formatPrice(r.price)}</span>
                    </div>
                    <div className="text-sm text-gray-200 flex items-center gap-2">
                      Skor: <ScoreBadge score={scoreNum} />
                    </div>
                  </div>

                  <ScoreBar score={scoreNum} />

                  {reasons.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {reasons.map((x) => (
                        <span
                          key={x}
                          className="text-[11px] px-2 py-1 rounded-full border border-gray-800 bg-[#0d1117] text-gray-300"
                        >
                          {x}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-[11px] text-gray-500">—</div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <DailyTopBuyTracker />

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-3xl border border-gray-800 bg-[#0b0f14] p-8">
          <h3 className="text-xl font-black">Nasıl Çalışır?</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div className="rounded-2xl border border-gray-800 bg-[#0d1117] p-4">
              <div className="font-bold">1) TradingView Alert</div>
              <div className="text-gray-500 mt-1">Pine Script alarmı JSON gönderir (BUY/SELL, score, reasons…).</div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#0d1117] p-4">
              <div className="font-bold">2) API Kaydeder</div>
              <div className="text-gray-500 mt-1">
                <code className="text-gray-300">/api/signals</code> sinyali DB’ye yazar.
              </div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#0d1117] p-4">
              <div className="font-bold">3) Haber Yakala</div>
              <div className="text-gray-500 mt-1">
                <code className="text-gray-300">/api/news/combined</code> haberleri çeker, tickers yakalar ve ana sayfada yayınlar.
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/terminal"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-bold"
            >
              Terminale Git →
            </Link>
            <div className="text-xs text-gray-500 flex items-center">Not: API’ler çalışmıyorsa kutular boş görünür.</div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 bg-[#0b0f14]">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-gray-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} KUARK</span>
          <Link href="/terminal" className="text-blue-400 hover:text-blue-300">
            Terminal
          </Link>
        </div>
      </footer>
    </main>
  );
}
