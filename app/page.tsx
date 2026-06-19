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

const ALLOWED_UNIVERSE = ["BIST100", "NASDAQ300", "ETF"] as const;
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
  const res = await fetch(url, { cache: "no-store" });
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
  if (u === "NASDAQ300") return "NASDAQ • 300";
  if (u === "ETF") return "ETF";
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
  // ETF’de marj sıralaması anlamsız → gizleyeceğiz
  if (universe === "ETF") return null;

  try {
    // ✅ backend endpoint'in sadece BIST100/NASDAQ100 biliyorsa:
    // NASDAQ300 seçiliyse backend'e NASDAQ100 diye gönderiyoruz (ya da backend'i NASDAQ300'e genişletirsin)
    const backendUniverse = universe === "NASDAQ300" ? "NASDAQ100" : universe;

    const url = `${base}/api/financials/top-margins?universe=${encodeURIComponent(backendUniverse)}&limit=10`;
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
  const [latest, kap, top, news] = await Promise.all([getLatestSignals(base), getKapImportant(base), getTopMargins(base, universe), getNewsCombined(base, universe)]);
  const nowIso = new Date().toISOString();
  const buyCount = latest.filter((s) => String(s.signal).toUpperCase() === "BUY").length;
  const sellCount = latest.filter((s) => String(s.signal).toUpperCase() === "SELL").length;
  const total = latest.length;
  const bullRate = total ? Math.round((buyCount / total) * 100) : null;
  const strongest = [...latest].sort((a,b)=>Number(b.score ?? 0)-Number(a.score ?? 0))[0];

  const { Activity, ArrowUpRight, BarChart3, Clock3, ExternalLink, Newspaper, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } = await import("lucide-react");
  const { default: AppShell } = await import("@/components/layout/AppShell");
  const { Badge, Card, EmptyState, LinkButton, SectionHeader, SegmentedControl } = await import("@/components/ui");

  const signalCards = latest.slice(0, 6);
  const marginRows = top?.topQuality?.slice(0, 8) ?? [];

  return (
    <AppShell>
      <div className="space-y-6 p-4 md:p-6">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="section-label mb-2">{universeLabel(universe)} • Son güncelleme {formatDateTR(nowIso)}</div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">Piyasa Genel Bakış</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Seçili piyasa evrenindeki son sinyaller, haberler, KAP akışı ve finansal kalite sıralamaları.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl value={universe} options={[{label:"BIST100",value:"BIST100",href:"/?u=BIST100"},{label:"NASDAQ100",value:"NASDAQ300",href:"/?u=NASDAQ300"},{label:"ETF",value:"ETF",href:"/?u=ETF"}]} />
            <LinkButton href={`/?u=${universe}`}><RefreshCw className="size-4"/>Yenile</LinkButton>
            <LinkButton href="/terminal" variant="primary"><BarChart3 className="size-4"/>Terminali Aç</LinkButton>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric icon={<TrendingUp className="size-4"/>} label="Aktif BUY" value={String(buyCount)} tone="buy" />
          <Metric icon={<TrendingDown className="size-4"/>} label="Aktif SELL" value={String(sellCount)} tone="sell" />
          <Metric icon={<Activity className="size-4"/>} label="Boğa Oranı" value={bullRate == null ? "—" : `%${bullRate}`} />
          <Metric icon={<ShieldCheck className="size-4"/>} label="En Güçlü Sinyal" value={strongest ? symbolToPlain(strongest.symbol) : "—"} detail={strongest?.score != null ? `Skor ${strongest.score}` : undefined} />
          <Metric icon={<BarChart3 className="size-4"/>} label="Manuel Win Rate" value="—" detail="Terminal kayıtlarından" />
          <Metric icon={<Clock3 className="size-4"/>} label="Son Tarama" value={formatDateTR(nowIso).split(" ").slice(-1)[0] ?? "—"} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Card className="p-4" id="sinyaller">
              <SectionHeader title="Sinyal Görünümü" eyebrow="Canlı veri" action={<LinkButton href="/signals" variant="ghost">Tümünü Gör<ArrowUpRight className="size-4"/></LinkButton>} />
              {signalCards.length === 0 ? <div className="mt-4"><EmptyState title="Henüz sinyal bulunmuyor." description="Veri geldiğinde bu alan otomatik dolacaktır." /></div> :
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{signalCards.map(r => <SignalPreview key={r.id} row={r} />)}</div>}
            </Card>

            <Card className="p-4">
              <SectionHeader title="Piyasa Isı Haritası" eyebrow="Skor yoğunluğu" />
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">{latest.map((s)=>{
                const sig=String(s.signal).toUpperCase(); const buy=sig==="BUY"; const score=Number(s.score ?? 0); const alpha=Math.min(.42, .08 + score/140);
                return <Link key={s.id} href={`/terminal?symbol=${encodeURIComponent(symbolToPlain(s.symbol))}`} className="focus-ring interactive-row rounded-xl border p-3 text-left" style={{backgroundColor: buy ? `rgba(52,211,153,${alpha})` : `rgba(251,113,133,${alpha})`, borderColor: buy ? "rgba(52,211,153,.25)" : "rgba(251,113,133,.25)"}}><div className="flex items-center justify-between gap-2"><span className="font-mono text-sm font-black">{symbolToPlain(s.symbol)}</span><Badge variant={buy?"buy":"sell"}>{sig}</Badge></div><div className="mt-2 text-xs text-slate-300">Skor <b>{s.score ?? "—"}</b></div></Link>
              })}</div>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="p-4" id="haberler"><SectionHeader title="Önemli Haberler" eyebrow="Akış" action={<Newspaper className="size-4 text-slate-500"/>}/>{news.length===0 ? <div className="mt-4"><EmptyState title="Haberler şu anda yüklenemiyor."/></div> : <div className="mt-4 space-y-2">{news.slice(0,6).map((n,i)=><a key={`${n.url}-${i}`} href={n.url} target="_blank" rel="noreferrer" className="interactive-row block rounded-xl border border-[var(--border)] p-3"><div className="flex items-center justify-between text-xs text-slate-500"><span>{n.source}</span><ExternalLink className="size-3"/></div><div className="mt-1 text-sm font-bold leading-snug">{n.headline}</div><div className="mt-2 flex flex-wrap gap-1">{(n.tickers||[]).slice(0,3).map(t=><Badge key={t}>{cleanTickerLabel(t)}</Badge>)}</div></a>)}</div>}</Card>
            {universe === "BIST100" && <Card className="p-4" id="kap"><SectionHeader title="KAP Bildirimleri" eyebrow="BIST100" />{kap.length===0 ? <div className="mt-4"><EmptyState title="Şu anda öne çıkan KAP bildirimi yok."/></div> : <div className="mt-4 space-y-2">{kap.slice(0,5).map((k,i)=><a key={i} href={k.url} target="_blank" rel="noreferrer" className="interactive-row block rounded-xl border border-[var(--border)] p-3"><div className="text-xs text-slate-500">{(k.stockCodes||[]).join(", ") || "KAP"} • {k.datetime ? formatDateTR(new Date(k.datetime*1000).toISOString()) : "—"}</div><div className="mt-1 text-sm font-bold">{k.title}</div></a>)}</div>}</Card>}
          </aside>
        </section>

        {universe !== "ETF" && <Card className="p-4" id="finansallar"><SectionHeader title="Finansal Kalite Sıralaması" eyebrow="Marjlar" />{marginRows.length===0 ? <div className="mt-4"><EmptyState title="Finansal veriler güncellenirken bir sorun oluştu." /></div> : <div className="mt-4 overflow-x-auto custom-scrollbar"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-[var(--surface-elevated)] text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Sıra</th><th className="px-3 py-2 text-left">Sembol</th><th className="px-3 py-2 text-right">Brüt Marj</th><th className="px-3 py-2 text-right">Net Marj</th><th className="px-3 py-2 text-right">Kalite</th><th className="px-3 py-2 text-right">Trend</th></tr></thead><tbody>{marginRows.map((r,i)=><tr key={r.symbol} className="interactive-row border-t border-[var(--border)]"><td className="px-3 py-2 text-slate-500">{i+1}</td><td className="px-3 py-2 font-mono font-black">{r.symbol}</td><td className="px-3 py-2 text-right">{fmtPct(r.grossMargin)}</td><td className="px-3 py-2 text-right">{fmtPct(r.netMargin)}</td><td className="px-3 py-2 text-right font-bold">{r.qualityScore ?? "—"}</td><td className="px-3 py-2 text-right text-slate-400"><Sparkline values={(r.netSeries?.length ? r.netSeries : r.grossSeries) ?? []}/></td></tr>)}</tbody></table></div>}</Card>}

        <TopBuyTrackingTable latestSignals={latest} nowIso={nowIso} />
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail?: string; tone?: "buy"|"sell" }) {
  const color = tone === "buy" ? "text-emerald-300" : tone === "sell" ? "text-rose-300" : "text-sky-300";
  return <div className="app-card p-4"><div className={`mb-3 ${color}`}>{icon}</div><div className="text-xs font-bold text-slate-500">{label}</div><div className="metric-value mt-1 text-2xl">{value}</div>{detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}</div>;
}
function SignalPreview({ row }: { row: SignalRow }) {
  const sig=String(row.signal).toUpperCase(); const buy=sig==="BUY"; const reasons=parseReasons(row.reasons).slice(0,2);
  return <Link href={`/terminal?focus=${encodeURIComponent(String(row.id))}`} className="interactive-row rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-mono text-lg font-black">{symbolToPlain(row.symbol)}</div><div className="text-xs text-slate-500">{formatDateTR(row.created_at)}</div></div><span className={`rounded-lg border px-2 py-1 text-xs font-black ${buy?"border-emerald-500/30 bg-emerald-500/10 text-emerald-200":"border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>{sig}</span></div><div className="mt-3 flex justify-between text-sm"><span>Fiyat <b>{formatPrice(row.price)}</b></span><span>Skor <b>{row.score ?? "—"}</b></span></div>{reasons.length>0 && <div className="mt-2 flex flex-wrap gap-1">{reasons.map(r=><span key={r} className="rounded-md bg-slate-700/30 px-2 py-1 text-[11px] text-slate-300">{r}</span>)}</div>}</Link>;
}
