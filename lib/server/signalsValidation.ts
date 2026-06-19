const SIGNAL_BODY_MAX_BYTES = 16 * 1024;
const SYMBOL_PATTERN = /^[A-Z0-9._:-]{1,24}$/;

type Signal = "BUY" | "SELL";

export type ValidatedSignalPayload = {
  secret: string;
  symbol: string;
  signal: Signal;
  price: number | null;
  score: number | null;
  reasons: string | null;
  t?: string | number;
};

export const SIGNALS_BODY_LIMIT_BYTES = SIGNAL_BODY_MAX_BYTES;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumberOrNull(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseSignalJson(rawBody: string): { data: ValidatedSignalPayload; error?: never } | { data?: never; error: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { error: "Bad JSON" };
  }

  if (!isRecord(parsed)) return { error: "Invalid payload" };

  const secret = parsed.secret;
  if (typeof secret !== "string") return { error: "Invalid secret" };

  const symbol = typeof parsed.symbol === "string" ? parsed.symbol.trim().toUpperCase() : "";
  if (!SYMBOL_PATTERN.test(symbol)) return { error: "Invalid symbol" };

  const signalRaw = typeof parsed.signal === "string" ? parsed.signal.trim().toUpperCase() : "";
  if (signalRaw !== "BUY" && signalRaw !== "SELL") return { error: "Invalid signal" };

  const price = finiteNumberOrNull(parsed.price);
  if (price === undefined) return { error: "Invalid price" };

  const score = finiteNumberOrNull(parsed.score);
  if (score === undefined) return { error: "Invalid score" };

  let reasons: string | null = null;
  if (parsed.reasons !== null && parsed.reasons !== undefined) {
    if (typeof parsed.reasons !== "string") return { error: "Invalid reasons" };
    if (parsed.reasons.length > 1000) return { error: "Invalid reasons" };
    reasons = parsed.reasons;
  }

  const t = parsed.t;
  if (t !== undefined && typeof t !== "string" && typeof t !== "number") {
    return { error: "Invalid timestamp" };
  }

  return { data: { secret, symbol, signal: signalRaw, price, score, reasons, ...(t === undefined ? {} : { t }) } };
}
