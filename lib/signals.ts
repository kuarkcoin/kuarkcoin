import { normalizeMarketSymbol } from "./symbols.ts";

export type SignalPayload = Record<string, unknown>;

const FIELD_ALIASES = {
  symbol: ["symbol", "ticker", "tickerid", "instrument", "market"],
  signal: ["signal", "action", "side", "direction", "order_action", "type"],
  price: ["price", "close", "entry_price", "fill_price", "entryPrice"],
  score: ["score", "strength", "puan", "rating", "confidence"],
  timeframe: ["timeframe", "interval", "tf", "period"],
  reasons: ["reasons", "reason", "strategy"],
} as const;

const SIGNAL_ALIASES: Record<string, "BUY" | "SELL"> = {
  BUY: "BUY",
  AL: "BUY",
  LONG: "BUY",
  STRONG_BUY: "BUY",
  BULLISH: "BUY",
  SELL: "SELL",
  SAT: "SELL",
  SHORT: "SELL",
  STRONG_SELL: "SELL",
  BEARISH: "SELL",
};

export function pickAlias(body: SignalPayload, aliases: readonly string[]) {
  for (const key of aliases) {
    if (body[key] !== undefined && body[key] !== null && String(body[key]).trim() !== "") return body[key];
  }
  return undefined;
}

export function normalizeWebhookSignal(raw: unknown) {
  const key = String(raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return SIGNAL_ALIASES[key] ?? null;
}

export function clampScore(raw: unknown) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  const score = Number(raw);
  if (!Number.isFinite(score)) return null;
  return Math.min(100, Math.max(0, score));
}

export function parseTvTime(t: unknown) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n < 1e12 ? n * 1000 : n);
}

export function cleanText(v: unknown, max = 1000) {
  return v == null ? null : String(v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}

export function normalizeSignalPayload(body: SignalPayload) {
  const norm = normalizeMarketSymbol(String(pickAlias(body, FIELD_ALIASES.symbol) ?? ""));
  const signal = normalizeWebhookSignal(pickAlias(body, FIELD_ALIASES.signal));
  const price = Number(pickAlias(body, FIELD_ALIASES.price));
  const scoreRaw = pickAlias(body, FIELD_ALIASES.score);
  const score = clampScore(scoreRaw);
  const timeframe = cleanText(pickAlias(body, FIELD_ALIASES.timeframe), 40);
  const timeRaw = body.timestamp ?? body.t;
  const created_at = timeRaw ? parseTvTime(timeRaw) : new Date();

  if (!norm) return { ok: false as const, error: "Invalid symbol" };
  if (!signal) return { ok: false as const, error: "Invalid signal" };
  if (!Number.isFinite(price) || price <= 0) return { ok: false as const, error: "Invalid price" };
  if (scoreRaw !== undefined && scoreRaw !== null && String(scoreRaw).trim() !== "" && score === null) return { ok: false as const, error: "Invalid score" };
  if (Number.isNaN(created_at.getTime())) return { ok: false as const, error: "Invalid timestamp" };

  return {
    ok: true as const,
    data: {
      symbol: norm.providerSymbol,
      signal,
      price,
      score,
      reasons: cleanText(pickAlias(body, FIELD_ALIASES.reasons), 1000),
      timeframe,
      created_at,
    },
  };
}
