export const MAX_SIGNAL_BODY_BYTES = 1024 * 1024;

export type SignalSide = "BUY" | "SELL";

export type ValidatedSignalPayload = {
  secret: string | null;
  symbol: string;
  signal: SignalSide;
  price: number | null;
  score: number | null;
  reasons: string | null;
  created_at: Date;
  timeframe: string | null;
  rvol: number | null;
  exchange: string | null;
  market: string | null;
  source: string | null;
  event_id: string | null;
  type: string | null;
  category: string | null;
  name: string | null;
  atr: number | null;
  rsi: number | null;
  entry_price: number | null;
  stop_price: number | null;
  target_1: number | null;
  target_2: number | null;
  target_3: number | null;
  position_mode: string | null;
  metadata: Record<string, unknown> | null;
};

export type SignalValidationResult =
  | { ok: true; value: ValidatedSignalPayload }
  | { ok: false; errors: string[] };

type PayloadObject = Record<string, unknown>;

function isPayloadObject(value: unknown): value is PayloadObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (!isPayloadObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function optionalString(body: PayloadObject, key: string): string | null {
  const value = body[key];
  if (value == null) return null;
  return String(value).trim() || null;
}

function optionalFiniteNumber(body: PayloadObject, key: string, errors: string[]) {
  const raw = body[key];
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    errors.push(`${key} must be a finite number`);
    return null;
  }
  return value;
}

function optionalPositiveFiniteNumber(body: PayloadObject, key: string, errors: string[]) {
  const value = optionalFiniteNumber(body, key, errors);
  if (value == null) return null;
  if (value <= 0) {
    errors.push(`${key} must be a positive finite number`);
    return null;
  }
  return value;
}

function optionalNonNegativeFiniteNumber(body: PayloadObject, key: string, errors: string[]) {
  const value = optionalFiniteNumber(body, key, errors);
  if (value == null) return null;
  if (value < 0) {
    errors.push(`${key} must be a non-negative finite number`);
    return null;
  }
  return value;
}

// TradingView t can arrive in seconds or milliseconds.
export function parseSignalTimestamp(t: unknown, fallback = new Date()) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return new Date(n < 1e12 ? n * 1000 : n);
}

export function validateSignalPayload(input: unknown): SignalValidationResult {
  const errors: string[] = [];

  if (!isPayloadObject(input)) {
    return { ok: false, errors: ["Payload must be a JSON object"] };
  }

  const symbol = String(input.symbol ?? "").trim();
  if (!symbol) errors.push("symbol is required");
  if (symbol.length > 100) errors.push("symbol must be at most 100 characters");

  const signal = String(input.signal ?? "").toUpperCase().trim();
  if (signal !== "BUY" && signal !== "SELL") errors.push("signal must be BUY or SELL");

  const reasons = input.reasons == null ? null : String(input.reasons);
  if (reasons != null && reasons.length > 4000) {
    errors.push("reasons must be at most 4000 characters");
  }

  const metadata = input.metadata == null ? null : input.metadata;
  if (metadata != null && !isPlainJsonObject(metadata)) {
    errors.push("metadata must be a plain JSON object");
  }

  const price = optionalPositiveFiniteNumber(input, "price", errors);
  const entry_price = optionalPositiveFiniteNumber(input, "entry_price", errors);
  const stop_price = optionalPositiveFiniteNumber(input, "stop_price", errors);
  const target_1 = optionalPositiveFiniteNumber(input, "target_1", errors);
  const target_2 = optionalPositiveFiniteNumber(input, "target_2", errors);
  const target_3 = optionalPositiveFiniteNumber(input, "target_3", errors);
  const atr = optionalNonNegativeFiniteNumber(input, "atr", errors);
  const rvol = optionalNonNegativeFiniteNumber(input, "rvol", errors);
  const rsi = optionalFiniteNumber(input, "rsi", errors);
  const score = optionalFiniteNumber(input, "score", errors);

  if (rsi != null && (rsi < 0 || rsi > 100)) errors.push("rsi must be between 0 and 100");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      secret: optionalString(input, "secret"),
      symbol,
      signal: signal as SignalSide,
      price,
      score,
      reasons,
      created_at: input.t ? parseSignalTimestamp(input.t) : new Date(),
      timeframe: optionalString(input, "timeframe"),
      rvol,
      exchange: optionalString(input, "exchange"),
      market: optionalString(input, "market"),
      source: optionalString(input, "source"),
      event_id: optionalString(input, "event_id"),
      type: optionalString(input, "type"),
      category: optionalString(input, "category"),
      name: optionalString(input, "name"),
      atr,
      rsi,
      entry_price,
      stop_price,
      target_1,
      target_2,
      target_3,
      position_mode: optionalString(input, "position_mode"),
      metadata: metadata as Record<string, unknown> | null,
    },
  };
}
