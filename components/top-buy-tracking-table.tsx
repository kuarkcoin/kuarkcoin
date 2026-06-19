"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, MoveDown, MoveUp } from "lucide-react";

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
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="section-label mb-1">Performans takibi</div>
          <h2 className="text-base font-black">BUY Sinyali Performansı</h2>
        </div>
        <span className="text-xs text-slate-500">Son güncelleme: {new Date(nowIso).toLocaleString("tr-TR")}</span>
      </div>

      <div className="app-card p-4">
        {rows.length === 0 ? (
          <div className="text-sm text-slate-400">
            Henüz BUY sinyali bulunamadı. Yeni BUY sinyalleri geldikçe tablo otomatik oluşur.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar" aria-label="Tablo yatay kaydırılabilir">
            <table className="min-w-[920px] w-full text-xs text-left">
              <thead className="sticky top-0 bg-[var(--surface-elevated)]">
                <tr className="text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Hisse</th>
                  <th className="py-2 pr-4 font-semibold">Kapanış</th>
                  {dayLabels.map((label) => (
                    <th key={label} className="py-2 pr-4 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {rows.map((row) => (
                  <tr key={row.symbol} className="interactive-row border-t border-[var(--border)]">
                    <td className="sticky left-0 bg-[var(--surface-elevated)] py-2 pr-4 font-semibold text-white">{row.symbol}</td>
                    <td className="py-2 pr-4 text-slate-300">{formatPrice(row.basePrice)}</td>
                    {row.prices.map((price, index) => {
                      const change =
                        price != null && row.basePrice
                          ? Number((((price - row.basePrice) / row.basePrice) * 100).toFixed(2))
                          : null;
                      const tone = change != null && change >= 0 ? "text-emerald-300" : "text-rose-300";
                      const Icon = change != null && change >= 0 ? MoveUp : MoveDown;
                      return (
                        <td key={`${row.symbol}-day-${index}`} className={`py-2 pr-4 ${tone}`}>
                          <span className="inline-flex items-center gap-1"><Icon className="size-3" />{fmtPct(change)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 inline-flex items-center gap-2 text-[11px] text-slate-500" title="1. gün kapanış fiyatı baz alınır. Tarayıcı hafızası teknik olarak yalnızca bu cihazda saklar."><Info className="size-3" /> Metodoloji ve yerel kayıt bilgisi</div>
      </div>
    </section>
  );
}
