export type HeatmapSignal = {
  symbol: string;
  plain: string;
  createdAt: string | null;
  signal: "BUY" | "SELL" | "";
  score: number;
  price: number | null;
  timeframe: string | null;
  exchange: string | null;
  source: string | null;
  reasons: string[];
  indicators: Record<string, number | string | boolean | null>;
};

type RawSignalRow = Record<string, unknown> | null | undefined;

function normalizeSymbol(sym: unknown) {
  const s = String(sym ?? "").trim();
  if (!s) return "NASDAQ:AAPL";
  if (s.includes(":")) return s.toUpperCase();
  return `NASDAQ:${s.toUpperCase()}`;
}

function symbolToPlain(sym: string) {
  return sym?.split(":")[1] ?? sym;
}

function finiteNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function optionalFiniteNumber(value: unknown) {
  const n = finiteNumber(value, Number.NaN);
  return Number.isFinite(n) ? n : null;
}

function normalizeCreatedAt(row: Record<string, unknown>) {
  const raw = row.createdAt ?? row.created_at ?? row.created_at_iso;
  if (typeof raw === "string" && raw.trim()) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const epoch = row.datetime ?? row.time ?? row.timestamp;
  if (typeof epoch === "number" || typeof epoch === "string") {
    const numeric = Number(epoch);
    if (Number.isFinite(numeric)) {
      const ms = numeric > 10_000_000_000 ? numeric : numeric * 1000;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  }

  return null;
}

function normalizeSignal(value: unknown): HeatmapSignal["signal"] {
  const signal = String(value ?? "").trim().toUpperCase();
  if (signal === "BUY" || signal === "SELL") return signal;
  return "";
}

function normalizeText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function normalizeReasons(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeIndicators(value: unknown): HeatmapSignal["indicators"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key.trim())
      .map(([key, raw]) => {
        if (raw === null || typeof raw === "string" || typeof raw === "boolean") return [key, raw];
        if (typeof raw === "number") return [key, Number.isFinite(raw) ? raw : null];
        return [key, String(raw)];
      }),
  );
}

export function mapSignalToHeatmap(row: RawSignalRow): HeatmapSignal {
  const safeRow = row && typeof row === "object" ? row : {};
  const symbol = normalizeSymbol(safeRow.symbol);
  const exchangeFromSymbol = symbol.includes(":") ? symbol.split(":")[0] : null;

  return {
    symbol,
    plain: symbolToPlain(symbol),
    createdAt: normalizeCreatedAt(safeRow),
    signal: normalizeSignal(safeRow.signal),
    score: Math.max(0, finiteNumber(safeRow.score, 0)),
    price: optionalFiniteNumber(safeRow.price ?? safeRow.close ?? safeRow.last_price),
    timeframe: normalizeText(safeRow.timeframe ?? safeRow.interval),
    exchange: normalizeText(safeRow.exchange) ?? exchangeFromSymbol,
    source: normalizeText(safeRow.source),
    reasons: normalizeReasons(safeRow.reasons),
    indicators: normalizeIndicators(safeRow.indicators),
  };
}
