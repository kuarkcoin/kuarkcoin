import { REASON_LABEL, normalizeReasonKey, symbolToPlain } from "@/constants/terminal";

export type SignalTone = "BUY" | "SELL" | string;

export type HeatmapSignal = {
  symbol: string;
  plain: string;
  signal: SignalTone;
  score: number;
  createdAt: string | null;
  shortTime: string;
  timeframe: string;
  price: string;
  indicators: string[];
  reasons: string | null;
};

export type ApiSignalRecord = {
  symbol?: string | null;
  signal?: SignalTone | null;
  score?: number | string | null;
  created_at?: string | null;
  datetime?: number | string | null;
  timeframe?: string | null;
  price?: number | string | null;
  reasons?: string | string[] | null;
  indicators?: string[] | string | null;
};

export const HEATMAP_FALLBACKS = {
  time: "Zaman bilgisi yok",
  timeframe: "Zaman dilimi belirtilmedi",
  price: "Fiyat bilgisi yok",
  indicators: "İndikatör bilgisi yok",
} as const;

function normalizeSymbol(sym: string | null | undefined) {
  const s = String(sym || "").trim();
  if (!s) return "NASDAQ:AAPL";
  if (s.includes(":")) return s;
  return `NASDAQ:${s}`;
}

function shortTimeFromRecord(record: ApiSignalRecord) {
  const createdAt = record.created_at ?? null;
  const timestamp = createdAt
    ? new Date(createdAt)
    : record.datetime != null
    ? new Date(Number(record.datetime) * 1000)
    : null;

  if (!timestamp || Number.isNaN(timestamp.getTime())) return HEATMAP_FALLBACKS.time;

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatPrice(price: ApiSignalRecord["price"]) {
  if (price == null || price === "") return HEATMAP_FALLBACKS.price;
  const value = Number(price);
  if (!Number.isFinite(value)) return String(price);
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 }).format(value);
}

function splitValues(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapIndicators(record: ApiSignalRecord) {
  const indicatorValues = splitValues(record.indicators);
  const values = indicatorValues.length > 0 ? indicatorValues : splitValues(record.reasons);
  const labels = values.map((value) => REASON_LABEL[normalizeReasonKey(value)] ?? value);
  return Array.from(new Set(labels)).slice(0, 2);
}

export function mapSignalToHeatmap(record: ApiSignalRecord): HeatmapSignal {
  const symbol = normalizeSymbol(record.symbol);
  const createdAt = record.created_at ?? null;
  const score = Number(record.score ?? 0);

  return {
    symbol,
    plain: symbolToPlain(symbol),
    signal: String(record.signal || "").toUpperCase(),
    score: Number.isFinite(score) ? score : 0,
    createdAt,
    shortTime: shortTimeFromRecord(record),
    timeframe: record.timeframe?.trim() || HEATMAP_FALLBACKS.timeframe,
    price: formatPrice(record.price),
    indicators: mapIndicators(record),
    reasons: Array.isArray(record.reasons) ? record.reasons.join(",") : record.reasons ?? null,
  };
}
