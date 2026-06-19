// app/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import TopBuyTrackingTable from "@/components/top-buy-tracking-table";

// =====================
// TYPES
// =====================
type SignalRow = {
  id: number;
  created_at: string;
  symbol: string;
  signal: string; // BUY | SELL
  price: number | null;
  score: number | null;
  reasons: string | null;
};

// ✅ KAP route'un döndürdüğü format (items -> KapUIItem)
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

const ALLOWED_UNIVERSE = ["BIST100", "NASDAQ100", "ETFS"] as const;
type Universe = (typeof ALLOWED_UNIVERSE)[number];

// =====================
// HELPERS
// =====================
function getApiBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const xfProto = h.get("x-forwarded-proto");
  const proto = xfProto ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function safeFetchJson(url: string) {
  // DB yok: sayfada "her request fetch" yerine route'lar zaten revalidate veriyor.
  // Burada no-store kalsın; asıl cache'yi route'larda veriyoruz.
  const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
  if (!res.ok) return null;
  return res.json();
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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function Sparkline({ values }: { values?: number[] }) {
  const v = (values ?? []).filter((x) => Number.isFinite(x));
  if (v.length < 2) return <span className="text-[11px] text-gray-600">—</span>;

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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-90">
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
  // NASDAQ:AAPL -> AAPL, ETF:QQQ -> QQQ, BIST:ASELS -> ASELS
  return t?.includes(":") ? t.split(":")[1] : t;
}

function universeLabel(u: Universe) {
  if (u === "NASDAQ100") return "NASDAQ • 100";
  if (u === "ETFS") return "ETFs";
  return "BIST100";
}

// =====================
// DATA FETCHERS
// =====================
async function getLatestSignals(base: string): Promise<SignalRow[]> {
  try {
    const json = await safeFetchJson(`${base}/api/signals`);
    const arr: SignalRow[] = (json?.data ?? []) as SignalRow[];
    return Array.isArray(arr) ? arr.slice(0, 6) : [];
  } catch (e) {
    console.error("getLatestSignals error:", e);
    return [];
  }
}

async function getKapImportant(base: string): Promise<KapRow[]> {
  try {
    const json = await safeFetchJson(`${base}/api/kap/bist100-important?mode=strict`);
    const arr: KapRow[] = (json?.items ?? []) as KapRow[];
    return Array.isArray(arr) ? arr.slice(0, 8) : [];
  } catch (e) {
    console.error("getKapImportant error:", e);
    return [];
  }
}

async function getTopMargins(base: string, universe: Universe): Promise<TopMarginsResp | null> {
  if (universe === "ETFS") return null;

  try {
    const url = `${base}/api/financials/top-margins?universe=${encodeURIComponent(universe)}&limit=10`;
    const json = await safeFetchJson(url);
    const data = (json?.data ?? null) as TopMarginsResp | null;
    return data && typeof data === "object" ? data : null;
  } catch (e) {
    console.error("getTopMargins error:", e);
    return null;
  }
}

async function getNewsCombined(base: string, universe: Universe): Promise<NewsItem[]> {
  try {
    const json = await safeFetchJson(`${base}/api/news/combined?u=${encodeURIComponent(universe)}&limit=12`);
    const arr: NewsItem[] = (json?.items ?? []) as NewsItem[];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("getNewsCombined error:", e);
    return [];
  }
}

// =====================
// PAGE
// =====================
export default async function HomePage({ searchParams }: { searchParams?: { u?: string } }) {
  const u = String(searchParams?.u ?? "BIST100").toUpperCase();
  const universe: Universe = (ALLOWED_UNIVERSE as readonly string[]).includes(u) ? (u as Universe) : "BIST100";

  const base = getApiBaseUrl();

  const [latest, kap, top, news] = await Promise.all([
    getLatestSignals(base),
    getKapImportant(base),
    getTopMargins(base, universe),
    getNewsCombined(base, universe),
  ]);

  const defaultSym = latest?.[0]?.symbol ? symbolToPlain(latest[0].symbol) : "BIMAS";
  const nowIso = new Date().toISOString();

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
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10">
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
              Yeni: Haber yakalayıcı (BIST100 / NASDAQ100 / ETFS) + marj sıralamaları.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/terminal"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-bold"
              >
                Terminale Git →
              </Link>

              <Link
                href="/terminal"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-700 hover:bg-gray-900 transition-colors font-semibold text-gray-200"
              >
                Son sinyalleri gör
              </Link>

              <Link
                href={`/bilanco?symbol=${encodeURIComponent(defaultSym)}`}
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-700 hover:bg-gray-900 transition-colors font-semibold text-gray-200"
              >
                Bilanço →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="text-sm font-bold">⚡ Canlı Akış</div>
                <div className="text-xs text-gray-500 mt-1">API’dan son sinyaller çekilir, terminalde otomatik yenilenir.</div>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="text-sm font-bold">🧠 Skor + Neden</div>
                <div className="text-xs text-gray-500 mt-1">“Golden Cross, VWAP, RSI Divergence…” gibi nedenler rozetlenir.</div>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="text-sm font-bold">🗞️ Haber Yakala</div>
                <div className="text-xs text-gray-500 mt-1">
                  Haber metninden / related alanından tickers yakalanır: <span className="text-gray-300">{universeLabel(universe)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Universe switch */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4 flex items-center justify-between">
          <div className="text-sm font-black">🌍 Universe</div>
          <div className="flex items-center gap-2">
            <Link
              href={`/?u=BIST100`}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
                universe === "BIST100"
                  ? "border-blue-600 bg-blue-950/30 text-blue-200"
                  : "border-gray-700 hover:bg-gray-900 text-gray-200"
              }`}
            >
              BIST100
            </Link>
            <Link
              href={`/?u=NASDAQ100`}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
                universe === "NASDAQ100"
                  ? "border-blue-600 bg-blue-950/30 text-blue-200"
                  : "border-gray-700 hover:bg-gray-900 text-gray-200"
              }`}
            >
              NASDAQ100
            </Link>
            <Link
              href={`/?u=ETFS`}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
                universe === "ETFS"
                  ? "border-blue-600 bg-blue-950/30 text-blue-200"
                  : "border-gray-700 hover:bg-gray-900 text-gray-200"
              }`}
            >
              ETFS
            </Link>
          </div>
        </div>
      </section>

      {/* Top Buy Tracking */}
      <TopBuyTrackingTable latestSignals={latest} nowIso={nowIso} />

      {/* News feed */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-lg font-black">🔥 Haber Akışı</h2>
          <span className="text-xs text-gray-500">Son kontrol: {formatDateTR(nowIso)}</span>
        </div>

        {news.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-6 text-gray-400 text-sm">
            Haber yok (veya <code className="text-gray-300">/api/news/combined</code> erişilemiyor).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {news.map((n, i) => {
              const dateIso = n.datetime ? new Date(n.datetime * 1000).toISOString() : "";
              const tick = (n.tickers || []).slice(0, 5);
              const tags = (n.tags || []).slice(0, 3);

              return (
                <a key={`${n.url}-${i}`} href={n.url} target="_blank" rel="noreferrer" className="block">
                  <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4 hover:bg-[#0f1620] transition-colors">
                    <div className="text-xs text-gray-500">
                      {n.source} • {dateIso ? formatDateTR(dateIso) : "—"}
                    </div>

                    <div className="mt-1 font-black text-sm">{n.headline}</div>

                    {tick.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tick.map((t) => (
                          <span
                            key={t}
                            className="text-[11px] px-2 py-1 rounded-full border border-gray-800 bg-[#0d1117] text-gray-300"
                          >
                            {cleanTickerLabel(t)}
                          </span>
                        ))}
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

                    <div className="mt-3 text-xs text-blue-400">Haberi aç →</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* High margin ranking (hidden for ETFS) */}
      {universe !== "ETFS" ? (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-lg font-black">💰 Yüksek Kâr Oranı</h2>

            <div className="text-xs text-gray-500">
              Universe: <span className="text-gray-200 font-semibold">{universeLabel(universe)}</span>
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
            <span className="text-xs text-gray-500">Son kontrol: {formatDateTR(nowIso)}</span>
          </div>

          {kap.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-6 text-gray-400 text-sm">
              Şu an yükseltici KAP haberi yok (veya <code className="text-gray-300">/api/kap/bist100-important</code>{" "}
              erişilemiyor).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {kap.map((k, i) => {
                const href = k.url ? String(k.url) : null;

                const dateIso = k.datetime ? new Date(k.datetime * 1000).toISOString() : "";
                const codes = Array.isArray(k.stockCodes) ? k.stockCodes : [];
                const tags = Array.isArray(k.tags) ? k.tags.slice(0, 3) : [];

                const Card = (
                  <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4 hover:bg-[#0f1620] transition-colors">
                    <div className="text-xs text-gray-500">
                      {(codes.length ? codes.join(", ") : "—")} • {dateIso ? formatDateTR(dateIso) : "—"}
                    </div>

                    <div className="mt-1 font-black text-sm">{k.title ?? "KAP Bildirimi"}</div>

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
            <div className="mt-2 text-xs text-gray-600">Son kontrol: {formatDateTR(nowIso)}</div>
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

              const scoreClass =
                scoreNum !== null && scoreNum >= 80
                  ? "text-green-400"
                  : scoreNum !== null && scoreNum >= 60
                  ? "text-blue-300"
                  : "text-white";

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
                          ? "border-green-600 text-green-300 bg-green-950/30"
                          : isSell
                          ? "border-red-600 text-red-300 bg-red-950/30"
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
                    <div className="text-sm text-gray-200">
                      Skor: <span className={`font-black ${scoreClass}`}>{scoreNum ?? "—"}</span>
                    </div>
                  </div>

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
