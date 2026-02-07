"use client";

import { useEffect, useMemo, useState } from "react";

type SignalRow = {
  symbol: string;
  signal: string;
  price: number | null;
  created_at: string;
};

type StoredRow = {
  symbol: string;
  basePrice: number;
  startDate: string;
  prices: Array<number | null>;
};

type Props = {
  latestSignals: SignalRow[];
  nowIso: string;
};

const STORAGE_KEY = "kuark.topBuyTracking";
const MAX_DAYS = 10;
const MAX_ROWS = 10;

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

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function symbolToPlain(sym: string) {
  return sym?.includes(":") ? sym.split(":")[1] : sym;
}

function diffDays(startKey: string, endKey: string) {
  const start = new Date(startKey);
  const end = new Date(endKey);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function loadRows(): StoredRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row?.symbol && typeof row.basePrice === "number");
  } catch (error) {
    console.error("TopBuyTracking localStorage parse error:", error);
    return [];
  }
}

function saveRows(rows: StoredRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function normalizeRows(rows: StoredRow[], latestSignals: SignalRow[], todayKey: string) {
  const buySignals = latestSignals
    .map((row) => ({ ...row, symbol: symbolToPlain(row.symbol) }))
    .filter((row) => String(row.signal || "").toUpperCase() === "BUY" && typeof row.price === "number")
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  const priceMap = new Map<string, number>();
  buySignals.forEach((row) => {
    if (row.price != null) {
      priceMap.set(row.symbol, row.price);
    }
  });

  let nextRows = rows
    .map((row) => {
      const dayIndex = diffDays(row.startDate, todayKey);
      if (dayIndex > MAX_DAYS - 1) return null;

      const prices = [...row.prices];
      while (prices.length < MAX_DAYS) prices.push(null);

      const todayPrice = priceMap.get(row.symbol) ?? null;
      if (todayPrice != null && dayIndex >= 0) {
        prices[dayIndex] = todayPrice;
        if (dayIndex === 0) {
          row.basePrice = todayPrice;
        }
      }

      return { ...row, prices };
    })
    .filter((row): row is StoredRow => row !== null);

  buySignals.forEach((signal) => {
    if (nextRows.some((row) => row.symbol === signal.symbol)) return;
    if (nextRows.length >= MAX_ROWS) {
      nextRows = nextRows
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(1);
    }
    const price = signal.price ?? 0;
    const prices = Array.from({ length: MAX_DAYS }, (_, index) => (index === 0 ? price : null));
    nextRows.push({
      symbol: signal.symbol,
      basePrice: price,
      startDate: todayKey,
      prices,
    });
  });

  if (nextRows.length > MAX_ROWS) {
    nextRows = nextRows
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, MAX_ROWS);
  }

  return nextRows;
}

export default function TopBuyTrackingTable({ latestSignals, nowIso }: Props) {
  const [rows, setRows] = useState<StoredRow[]>([]);

  useEffect(() => {
    const todayKey = toDateKey(new Date());
    const stored = loadRows();
    const normalized = normalizeRows(stored, latestSignals, todayKey);
    const sorted = normalized.sort((a, b) => b.basePrice - a.basePrice);
    setRows(sorted);
    saveRows(sorted);
  }, [latestSignals]);

  const dayLabels = useMemo(() => Array.from({ length: MAX_DAYS }, (_, i) => `${i + 1}. Gün`), []);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-black">📈 Günlük En Yüksek BUY Takibi (10 Gün)</h2>
          <p className="text-xs text-gray-500 mt-1">
            Supabase olmadan yerel tarayıcı hafızasında takip edilir. 11. gün yeni hisse gelirse en eski kayıt düşer.
          </p>
        </div>
        <span className="text-xs text-gray-500">Son güncelleme: {new Date(nowIso).toLocaleString("tr-TR")}</span>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-[#0b0f14] p-4">
        {rows.length === 0 ? (
          <div className="text-sm text-gray-400">
            Henüz BUY sinyali bulunamadı. Yeni BUY sinyalleri geldikçe tablo otomatik oluşur.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-xs text-left">
              <thead>
                <tr className="text-gray-400">
                  <th className="py-2 pr-4 font-semibold">Hisse</th>
                  <th className="py-2 pr-4 font-semibold">Kapanış</th>
                  {dayLabels.map((label) => (
                    <th key={label} className="py-2 pr-4 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {rows.map((row) => (
                  <tr key={row.symbol} className="border-t border-gray-800/70">
                    <td className="py-2 pr-4 font-semibold text-white">{row.symbol}</td>
                    <td className="py-2 pr-4 text-gray-300">{formatPrice(row.basePrice)}</td>
                    {row.prices.map((price, index) => {
                      const change =
                        price != null && row.basePrice
                          ? Number((((price - row.basePrice) / row.basePrice) * 100).toFixed(2))
                          : null;
                      const tone = change != null && change >= 0 ? "text-green-300" : "text-red-300";
                      return (
                        <td key={`${row.symbol}-day-${index}`} className={`py-2 pr-4 ${tone}`}>
                          {fmtPct(change)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 text-[11px] text-gray-500">
          Not: 1. gün kapanış fiyatı baz alınır. Gün içinde yeni BUY fiyatı gelirse ilgili gün yüzdesi güncellenir.
        </div>
      </div>
    </section>
  );
}
