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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  return `${Math.floor(h / 24)}g`;
}

function symbolToPlain(sym: string) {
  return sym?.split(":")[1] ?? sym;
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] px-2.5 py-1 rounded-full border border-gray-800 bg-[#0b0f14] text-gray-200">
      {children}
    </span>
  );
}

async function getLatestSignals(): Promise<SignalRow[]> {
  try {
    // ✅ Server-side absolute URL üret
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (!host) return [];

    const url = `${proto}://${host}/api/signals`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    const arr: SignalRow[] = json.data ?? [];
    return arr.slice(0, 6);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const latest = await getLatestSignals();

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
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Canlı Sinyal Terminali: <span className="text-blue-500">KUARK</span>
            </h1>

            <p className="text-gray-300 max-w-2xl leading-relaxed">
              Pine Script alarmından gelen sinyalleri toplayıp tek ekranda gösterir:
              skor, nedenler, Win/Loss takibi ve grafikte işaretleme.
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
                <div className="text-sm font-bold">📌 Win/Loss Takibi</div>
                <div className="text-xs text-gray-500 mt-1">
                  Manuel WIN/LOSS ile sinyal kalitesini ölçersin.
                </div>
              </div>
            </div>
          </div>
        </div>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {latest.map((r) => {
              const sig = String(r.signal || "").toUpperCase();
              const isBuy = sig === "BUY";
              const isSell = sig === "SELL";
              return (
                <Link
                  key={r.id}
                  href="/terminal"
                  className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4 hover:bg-[#0f1620] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Sembol</div>
                      <div className="text-base font-black truncate">{r.symbol}</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {timeAgo(r.created_at)} • {symbolToPlain(r.symbol)}
                      </div>
                    </div>

                    <div
                      className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                        isBuy
                          ? "border-green-700 text-green-300 bg-green-950/20"
                          : isSell
                          ? "border-red-700 text-red-300 bg-red-950/20"
                          : "border-gray-700 text-gray-300 bg-gray-900/30"
                      }`}
                    >
                      {sig || "—"}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-200">
                      Fiyat: <span className="font-bold text-white">{r.price ?? "—"}</span>
                    </div>
                    <div className="text-sm text-gray-200">
                      Skor: <span className="font-black text-white">{r.score ?? "—"}</span>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-gray-500 line-clamp-2">
                    {r.reasons || "—"}
                  </div>
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
              <div className="font-bold">3) Terminal Gösterir</div>
              <div className="text-gray-500 mt-1">
                KUARK Terminal grafikte işaretler, listeler, Win/Loss alır.
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
              Not: <span className="ml-1 text-gray-300">/api/signals</span> çalışmıyorsa “Son Sinyaller” boş görünür.
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