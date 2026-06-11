import { ASSETS } from "@/constants/terminal";

type TrackedSymbolType = "stock" | "etf" | "crypto";

export type TrackedSymbol = {
  symbol: string;
  name: string;
  type: TrackedSymbolType;
  category: string;
  exchange: string;
};

const normalizePlainSymbol = (symbol: string) => String(symbol || "").trim().toUpperCase();

const BIST_SET = new Set<string>(ASSETS.BIST.map(normalizePlainSymbol));
const CRYPTO_SET = new Set<string>(ASSETS.CRYPTO.map(normalizePlainSymbol));
const ETF_SET = new Set<string>(ASSETS.ETF.map(normalizePlainSymbol));

export function normalizeSymbol(symbol: string) {
  const raw = String(symbol || "").trim();
  if (!raw) return "";

  const normalizedPrefix = raw.replace(/^BIST_DLY:/i, "BIST:");
  if (normalizedPrefix.includes(":")) {
    const [exchange, ticker] = normalizedPrefix.split(":", 2);
    const normalizedTicker = normalizePlainSymbol(ticker);
    return normalizedTicker ? `${exchange.toUpperCase()}:${normalizedTicker}` : "";
  }

  const ticker = normalizePlainSymbol(raw);
  if (!ticker) return "";
  if (BIST_SET.has(ticker)) return `BIST:${ticker}`;
  if (CRYPTO_SET.has(ticker)) return `BINANCE:${ticker}`;
  if (ETF_SET.has(ticker)) return `AMEX:${ticker}`;
  return `NASDAQ:${ticker}`;
}

const trackedSymbols: TrackedSymbol[] = [
  ...ASSETS.NASDAQ.map((ticker) => ({
    symbol: `NASDAQ:${ticker}`,
    name: ticker,
    type: "stock" as const,
    category: "NASDAQ",
    exchange: "NASDAQ",
  })),
  ...ASSETS.ETF.map((ticker) => ({
    symbol: `AMEX:${ticker}`,
    name: ticker,
    type: "etf" as const,
    category: "ETF",
    exchange: "AMEX",
  })),
  ...ASSETS.CRYPTO.map((ticker) => ({
    symbol: `BINANCE:${ticker}`,
    name: ticker,
    type: "crypto" as const,
    category: "Crypto",
    exchange: "BINANCE",
  })),
  ...ASSETS.BIST.map((ticker) => ({
    symbol: `BIST:${ticker}`,
    name: ticker,
    type: "stock" as const,
    category: "BIST",
    exchange: "BIST",
  })),
];

const trackedSymbolMap = new Map(trackedSymbols.map((item) => [normalizeSymbol(item.symbol), item]));

export function findTrackedSymbol(symbol: string) {
  return trackedSymbolMap.get(normalizeSymbol(symbol)) ?? null;
}
