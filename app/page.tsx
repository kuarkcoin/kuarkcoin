// app/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";

type SignalRow = {
  id: number;
  created_at: string;
  symbol: string;
  signal: string; // BUY | SELL
  price: number | null;
  score: number | null;
  reasons: string | null;
};

type KapRow = {
  publishDate?: string;
  stockCodes?: string;
  kapTitle?: string;
  summary?: string;
  disclosureIndex?: number | string;
  tags?: string[]; // ✅ eklendi
};

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

async function getLatestSignals(): Promise<SignalRow[]> {
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (!host) return [];

    const url = `${proto}://${host}/api/signals`;

    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok) return [];
    const json = await res.json();
    const arr: SignalRow[] = json.data ?? [];
    return arr.slice(0, 6);
  } catch (e) {
    console.error("getLatestSignals error:", e);
    return [];
  }
}

async function getKapImportant(): Promise<KapRow[]> {
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (!host) return [];

    const url = `${proto}://${host}/api/kap/bist100-important`;

    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok) return [];

    const json = await res.json();
    const arr: KapRow[] = json.data ?? [];
    return arr.slice(0, 8);
  } catch (e) {
    console.error("getKapImportant error:", e);
    return [];
  }
}

function tagLabel(tag: string) {
  const t = String(tag || "").toUpperCase();
  if (t === "IS_ANLASMASI") return "🟢 İş Anlaşması";
  if (t === "SATIN_ALMA") return "🚀 Satın Alma";
  if (t === "BIRLESME") return "🔥 Birleşme/Bölünme";
  if (t === "YUKSEK_KAR") return "💰 Yüksek Kâr/Bilanço";
  if (t === "TEMETTU") return "🟦 Temettü";
  if (t === "GERI_ALIM") return "🟣 Geri Alım";
  return "📌 Diğer";
}

export default async function HomePage() {
  const latest = await getLatestSignals();
  const kap = await getKapImportant();

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
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Canlı Sinyal Terminali: <span className="text-blue-500">KUARK</span>
            </h1>

            <p className="text-gray-300 max-w-2xl leading-relaxed">
              Pine Script alarmından gelen sinyalleri toplayıp tek ekranda gösterir:
              skor, nedenler, Win/Loss takibi ve grafikte işaretleme. Ek olarak ana sayfada
              BIST100 için yükseltici KAP bildirimlerini etiketleyip özetler.
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="text-sm font-bold">⚡ Canlı Akış</div>
                <div className="text-xs text-gray-500 mt-1">
                  API’dan son sinyaller çekilir, terminalde otomatik yenilenir.
                </div>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="text-sm font-bold">🧠 Skor + Neden</div>
                <div className="text-xs text-gray-500 mt-1">
                  “Golden Cross, VWAP, RSI Divergence…” gibi nedenler rozetlenir.
                </div>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
                <div className="text-sm font-bold">📰 KAP Etiket</div>
                <div className="text-xs text-gray-500 mt-1">
                  İş anlaşması / satın alma / yüksek kâr gibi türlere ayrılır.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KAP Important */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-lg font-black">KAP • BIST100 Önemli</h2>
          <span className="text-xs text-gray-500">
            Son kontrol: {formatDateTR(new Date().toISOString())}
          </span>
        </div>

        {kap.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-6 text-gray-400 text-sm">
            Şu an yükseltici KAP haberi yok (veya{" "}
            <code className="text-gray-300">/api/kap/bist100-important</code> erişilemiyor).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {kap.map((k, i) => {
              const idx = k.disclosureIndex ?? i;
              const href =
                k.disclosureIndex != null && String(k.disclosureIndex).trim() !== ""
                  ? `https://www.kap.org.tr/tr/Bildirim/${encodeURIComponent(String(k.disclosureIndex))}`
                  : null;

              const summary = String(k.summary ?? "").trim();
              const summaryShort = summary.length > 180 ? summary.slice(0, 180) + "…" : summary;

              const tags = Array.isArray(k.tags) ? k.tags.slice(0, 3) : [];

              const Card = (
                <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4 hover:bg-[#0f1620] transition-colors">
                  <div className="text-xs text-gray-500">
                    {k.stockCodes ?? "—"} • {k.publishDate ? formatDateTR(k.publishDate) : "—"}
                  </div>

                  <div className="mt-1 font-black text-sm">
                    {k.kapTitle ?? "KAP Bildirimi"}
                  </div>

                  {/* ✅ Etiket rozetleri */}
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

                  {summaryShort ? (
                    <div className="mt-2 text-xs text-gray-400 leading-relaxed">
                      {summaryShort}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-600">—</div>
                  )}

                  {href ? <div className="mt-3 text-xs text-blue-400">KAP’ta aç →</div> : null}
                </div>
              );

              if (!href) return <div key={String(idx)}>{Card}</div>;

              return (
                <a key={String(idx)} href={href} target="_blank" rel="noreferrer" className="block">
                  {Card}
                </a>
              );
            })}
          </div>
        )}
      </section>

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
            <div className="mt-2 text-xs text-gray-600">Son kontrol: {formatDateTR(new Date().toISOString())}</div>
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
              <div className="text-gray-500 mt-1">
                Pine Script alarmı JSON gönderir (BUY/SELL, score, reasons…).
              </div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#0d1117] p-4">
              <div className="font-bold">2) API Kaydeder</div>
              <div className="text-gray-500 mt-1">
                <code className="text-gray-300">/api/signals</code> sinyali DB’ye yazar.
              </div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#0d1117] p-4">
              <div className="font-bold">3) KAP Etiket</div>
              <div className="text-gray-500 mt-1">
                <code className="text-gray-300">/api/kap/bist100-important</code> yükseltici türleri seçer.
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
            <div className="text-xs text-gray-500 flex items-center">
              Not: <span className="ml-1 text-gray-300">/api/signals</span> veya{" "}
              <span className="ml-1 text-gray-300">/api/kap/bist100-important</span> çalışmıyorsa kutular boş görünür.
            </div>
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