import { BIST100, ETFS, NASDAQ100, NASDAQ300 } from "@/constants/universe";

export type Market = "BIST" | "NASDAQ" | "ETF" | "CRYPTO";
const CRYPTO = ["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","AVAXUSDT","DOGEUSDT","DOTUSDT","LINKUSDT","MATICUSDT","LTCUSDT","UNIUSDT","SHIBUSDT"];

export function normalizeMarketSymbol(input: string) {
  const raw = String(input || "").trim().toUpperCase().replace(/^BIST_DLY:/, "BIST:");
  const [, pref, rest] = raw.match(/^([A-Z_]+):(.*)$/) ?? [];
  const ticker = (rest || raw).replace(/[^A-Z0-9.]/g, "");
  if (!ticker) return null;
  if (pref === "BIST" || BIST100.includes(ticker)) return { market: "BIST" as const, ticker, providerSymbol: `BIST:${ticker}` };
  if (pref === "BINANCE" || CRYPTO.includes(ticker)) return { market: "CRYPTO" as const, ticker, providerSymbol: `BINANCE:${ticker}` };
  if (pref === "AMEX" || pref === "ETF" || ETFS.includes(ticker)) return { market: "ETF" as const, ticker, providerSymbol: ticker };
  if (NASDAQ300.includes(ticker) || NASDAQ100.includes(ticker)) return { market: "NASDAQ" as const, ticker, providerSymbol: ticker };
  return null;
}

export function normalizeWebhookSymbol(input: string) {
  const raw = String(input || "").trim().toUpperCase();
  if (!raw || raw.length > 40 || !/^[A-Z0-9._:-]+$/.test(raw)) return null;

  const parts = raw.split(":");
  if (parts.length > 2) return null;

  if (parts.length === 2) {
    const [pref, ticker] = parts;
    if (!pref || !ticker || ticker.length > 30) return null;
    const normalizedTicker = ticker.replace(/[^A-Z0-9.]/g, "");
    const market = pref === "BIST" || pref === "BIST_DLY"
      ? "BIST"
      : pref === "BINANCE"
        ? "CRYPTO"
        : pref === "NASDAQ"
          ? "NASDAQ"
          : pref === "AMEX" || pref === "ETF"
            ? "ETF"
            : undefined;

    return {
      ...(market ? { market } : {}),
      ticker: normalizedTicker || ticker,
      providerSymbol: raw,
    };
  }

  if (raw.length > 30) return null;
  return normalizeMarketSymbol(raw) ?? { ticker: raw, providerSymbol: raw };
}

export function dedupeSymbols(symbols: readonly string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of symbols) {
    const n = normalizeMarketSymbol(s);
    const key = n?.providerSymbol ?? String(s).trim().toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key); out.push(key.includes(":") ? key.split(":")[1] : key);
  }
  return out;
}
