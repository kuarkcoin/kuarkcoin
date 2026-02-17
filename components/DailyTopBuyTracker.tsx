"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SignalRow = {
  symbol: string;
  price: number | null;
  score: number | null;
};

type StoredPick = {
  pickDate: string; // YYYY-MM-DD (Europe/Istanbul)
  symbol: string;
  startPrice: number | null;
  prices: Record<string, number | null>;
};

type TopBuyResponse = {
  topBuy?: SignalRow[];
};

type SignalsResponse = {
  data?: SignalRow[];
};

const STORAGE_KEY = "kuark:daily-top-buy-tracker:v1";

const istDateFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" });
const istWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Istanbul",
  weekday: "short",
});

function getIstanbulDateString(date = new Date()) {
  return istDateFormatter.format(date);
}

function isBusinessDay(date: Date) {
  const day = istWeekdayFormatter.format(date);
  return day !== "Sat" && day !== "Sun";
}

function getBusinessDaySequence(startDate: string, count: number) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00Z`);

  while (dates.length < count) {
    if (isBusinessDay(cursor)) {
      dates.push(getIstanbulDateString(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function formatNumber(n: number | null, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: digits }).format(n);
}

function formatPercent(n: number | null, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: digits }).format(n)}%`;
}

function toPlainSymbol(sym: string) {
  return sym?.includes(":") ? sym.split(":")[1] : sym;
}

function readStorage(): StoredPick[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredPick[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(items: StoredPick[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default function DailyTopBuyTracker() {
  const [picks, setPicks] = useState<StoredPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const todayString = getIstanbulDateString();
      const todayDate = new Date(`${todayString}T12:00:00Z`);

      const [topBuyJson, signalsJson] = await Promise.all([
        fetchJson<TopBuyResponse>("/api/signals?scope=todayTop"),
        fetchJson<SignalsResponse>("/api/signals"),
      ]);

      const topBuy = topBuyJson?.topBuy?.[0];
      const signals = signalsJson?.data ?? [];
      const latestPriceBySymbol = new Map<string, number>();

      for (const row of signals) {
        const plain = toPlainSymbol(row.symbol);
        if (latestPriceBySymbol.has(plain)) continue;
        if (typeof row.price === "number") latestPriceBySymbol.set(plain, row.price);
      }

      let next = readStorage();

      if (isBusinessDay(todayDate) && topBuy?.symbol) {
        const todayPickIndex = next.findIndex((p) => p.pickDate === todayString);
        const plainSymbol = toPlainSymbol(topBuy.symbol);
        const startPrice =
          typeof topBuy.price === "number" ? topBuy.price : latestPriceBySymbol.get(plainSymbol) ?? null;
        const basePrices = { [todayString]: startPrice };
        const nextPick: StoredPick = {
          pickDate: todayString,
          symbol: plainSymbol,
          startPrice,
          prices: basePrices,
        };

        if (todayPickIndex === -1) {
          next = [...next, nextPick];
        } else {
          next = next.map((p, idx) =>
            idx === todayPickIndex
              ? {
                  ...p,
                  symbol: plainSymbol,
                  startPrice: startPrice ?? p.startPrice,
                  prices: { ...p.prices, ...basePrices },
                }
              : p
          );
        }
      }

      next = next
        .map((p) => {
          const updatedPrice = latestPriceBySymbol.get(p.symbol) ?? null;
          if (updatedPrice == null) return p;
          return {
            ...p,
            prices: {
              ...p.prices,
              [todayString]: updatedPrice,
            },
          };
        })
        .sort((a, b) => a.pickDate.localeCompare(b.pickDate))
        .slice(-11);

      writeStorage(next);
      setPicks(next);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tableRows = useMemo(() => {
    return picks.map((pick) => {
      const days = getBusinessDaySequence(pick.pickDate, 11);
      const startPrice = pick.startPrice;

      const dayChanges = days.slice(1).map((dateKey) => {
        const price = pick.prices?.[dateKey] ?? null;
        if (price == null || startPrice == null) return null;
        return ((price - startPrice) / startPrice) * 100;
      });

      const finalDayKey = days[10];
      const finalPrice = pick.prices?.[finalDayKey] ?? null;
      const finalChange =
        finalPrice == null || startPrice == null ? null : ((finalPrice - startPrice) / startPrice) * 100;

      return {
        ...pick,
        days,
        dayChanges,
        finalPrice,
        finalChange,
      };
    });
  }, [picks]);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black">📈 Günlük En Yüksek BUY Takibi</h2>
          <div className="text-xs text-gray-500 mt-1">
            Her iş günü en yüksek BUY skoru seçilir, 10 iş günü boyunca değişim izlenir. 11. günde toplam değişim
            hesaplanır, 12. günde eski kayıt düşer.
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>Güncelleme: {lastUpdated ? new Date(lastUpdated).toLocaleString("tr-TR") : "—"}</span>
          <button
            type="button"
            onClick={refresh}
            className="px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-900 transition-colors"
          >
            Yenile
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
        {loading ? (
          <div className="text-sm text-gray-400">Yükleniyor...</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : tableRows.length === 0 ? (
          <div className="text-sm text-gray-400">Henüz kayıt yok. İlk iş günü BUY sinyali beklendi.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-xs text-gray-300">
              <thead>
                <tr className="text-left text-[11px] text-gray-500">
                  <th className="py-2 pr-3">Tarih</th>
                  <th className="py-2 pr-3">Hisse</th>
                  <th className="py-2 pr-3">Kapanış (Gün 0)</th>
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <th key={`day-${idx + 1}`} className="py-2 pr-3">
                      Gün {idx + 1}
                    </th>
                  ))}
                  <th className="py-2 pr-3">11. Gün Fiyat</th>
                  <th className="py-2">11. Gün %</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.pickDate} className="border-t border-gray-800">
                    <td className="py-2 pr-3 text-gray-400">{row.pickDate}</td>
                    <td className="py-2 pr-3 font-semibold text-gray-200">{row.symbol}</td>
                    <td className="py-2 pr-3">{formatNumber(row.startPrice)}</td>
                    {row.dayChanges.map((pct, idx) => (
                      <td key={`${row.pickDate}-${idx}`} className="py-2 pr-3">
                        <span className={pct == null ? "text-gray-500" : pct >= 0 ? "text-green-300" : "text-red-300"}>
                          {formatPercent(pct)}
                        </span>
                      </td>
                    ))}
                    <td className="py-2 pr-3">{formatNumber(row.finalPrice)}</td>
                    <td className="py-2">
                      <span
                        className={
                          row.finalChange == null
                            ? "text-gray-500"
                            : row.finalChange >= 0
                            ? "text-green-300"
                            : "text-red-300"
                        }
                      >
                        {formatPercent(row.finalChange)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
