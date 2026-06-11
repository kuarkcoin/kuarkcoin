import { ASSETS } from "@/constants/terminal";

export type TrackedSymbol = {
  symbol: string;
  name: string;
  type: "stock" | "etf" | "crypto";
  category: string;
  exchange: string;
  active: boolean;
};

const ETF_SYMBOLS = new Set<string>(ASSETS.ETF.map((symbol) => symbol.toUpperCase()));
const CRYPTO_SYMBOLS = new Set<string>(ASSETS.CRYPTO.map((symbol) => symbol.toUpperCase()));
const BIST_SYMBOLS = new Set<string>((ASSETS.BIST ?? []).map((symbol) => symbol.toUpperCase()));

const KNOWN_NAMES: Record<string, string> = {
  "NASDAQ:AAPL": "Apple Inc.",
  "NASDAQ:MSFT": "Microsoft Corporation",
  "NASDAQ:NVDA": "NVIDIA Corporation",
  "NASDAQ:AMZN": "Amazon.com, Inc.",
  "NASDAQ:GOOGL": "Alphabet Inc.",
  "NASDAQ:GOOG": "Alphabet Inc.",
  "NASDAQ:META": "Meta Platforms, Inc.",
  "NASDAQ:TSLA": "Tesla, Inc.",
  "NASDAQ:AMD": "Advanced Micro Devices, Inc.",
  "NASDAQ:NFLX": "Netflix, Inc.",
  "AMEX:SPY": "SPDR S&P 500 ETF Trust",
  "AMEX:QQQ": "Invesco QQQ Trust",
  "AMEX:IWM": "iShares Russell 2000 ETF",
  "AMEX:DIA": "SPDR Dow Jones Industrial Average ETF Trust",
  "AMEX:GLD": "SPDR Gold Shares",
  "BINANCE:BTCUSDT": "Bitcoin / TetherUS",
  "BINANCE:ETHUSDT": "Ethereum / TetherUS",
  "BINANCE:SOLUSDT": "Solana / TetherUS",
  "BIST:ASELS": "Aselsan Elektronik Sanayi ve Ticaret A.Ş.",
  "BIST:THYAO": "Türk Hava Yolları A.O.",
  "BIST:AKBNK": "Akbank T.A.Ş.",
  "BIST:GARAN": "Türkiye Garanti Bankası A.Ş.",
  "BIST:EREGL": "Ereğli Demir ve Çelik Fabrikaları T.A.Ş.",
};

function uniqueSymbols(symbols: readonly string[]) {
  return Array.from(new Set(symbols.map((symbol) => symbol.toUpperCase())));
}

function makeTrackedSymbol(symbol: string): TrackedSymbol {
  const normalized = normalizeSymbol(symbol);
  const [exchange, plainSymbol = normalized] = normalized.split(":");

  if (CRYPTO_SYMBOLS.has(plainSymbol)) {
    return {
      symbol: normalized,
      name: KNOWN_NAMES[normalized] ?? plainSymbol,
      type: "crypto",
      category: "Crypto",
      exchange,
      active: true,
    };
  }

  if (ETF_SYMBOLS.has(plainSymbol)) {
    return {
      symbol: normalized,
      name: KNOWN_NAMES[normalized] ?? plainSymbol,
      type: "etf",
      category: "ETF",
      exchange,
      active: true,
    };
  }

  if (BIST_SYMBOLS.has(plainSymbol)) {
    return {
      symbol: normalized,
      name: KNOWN_NAMES[normalized] ?? plainSymbol,
      type: "stock",
      category: "BIST",
      exchange,
      active: true,
    };
  }

  return {
    symbol: normalized,
    name: KNOWN_NAMES[normalized] ?? plainSymbol,
    type: "stock",
    category: "NASDAQ",
    exchange,
    active: true,
  };
}

export function normalizeSymbol(symbol: string) {
  const raw = String(symbol || "").trim().toUpperCase();
  if (!raw) return "NASDAQ:AAPL";

  const withoutLegacyPrefix = raw.startsWith("BIST_DLY:") ? raw.replace("BIST_DLY:", "BIST:") : raw;
  if (withoutLegacyPrefix.includes(":")) return withoutLegacyPrefix;

  if (BIST_SYMBOLS.has(withoutLegacyPrefix)) return `BIST:${withoutLegacyPrefix}`;
  if (CRYPTO_SYMBOLS.has(withoutLegacyPrefix)) return `BINANCE:${withoutLegacyPrefix}`;
  if (ETF_SYMBOLS.has(withoutLegacyPrefix)) return `AMEX:${withoutLegacyPrefix}`;
  return `NASDAQ:${withoutLegacyPrefix}`;
}

export const TRACKED_SYMBOLS: TrackedSymbol[] = [
  ...uniqueSymbols(ASSETS.NASDAQ),
  ...uniqueSymbols(ASSETS.ETF),
  ...uniqueSymbols(ASSETS.CRYPTO),
  ...uniqueSymbols(ASSETS.BIST ?? []),
].map(makeTrackedSymbol);

const TRACKED_BY_SYMBOL = new Map(TRACKED_SYMBOLS.map((tracked) => [tracked.symbol, tracked]));

export function findTrackedSymbol(symbol: string) {
  return TRACKED_BY_SYMBOL.get(normalizeSymbol(symbol)) ?? null;
}
