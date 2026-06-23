export type SignalSide = "BUY" | "SELL";
export type Plan = "FREE" | "PREMIUM";

export type SignalPayload = {
  symbol: string;
  signal: SignalSide;
  price: number | null;
  score: number | null;
  rvol: number | null;
  reasons: string | null;
  event_id: string;
  plan: Plan;
  created_at: Date;
  timeframe?: string | null;
  type?: string | null;
  category?: string | null;
  exchange?: string | null;
  source?: string | null;
  name?: string | null;
};

export function checkScanSecret(bodySecret: unknown, configuredSecret: string | undefined) {
  if (!configuredSecret) return { ok: false as const, status: 503, error: "SCAN_SECRET missing" };
  if (bodySecret !== configuredSecret) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const };
}

export function parseTvTime(t: unknown) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n < 1e12 ? n * 1000 : n);
}

function finiteNumber(value: unknown, field: string, required = false): { value: number | null } | { error: string } {
  if (value == null || value === "") {
    if (required) return { error: `${field} required` };
    return { value: null };
  }
  const n = Number(value);
  return Number.isFinite(n) ? { value: n } : { error: `Invalid ${field}` };
}

export function makeDuplicateEventId(input: { symbol: string; signal: string; t?: unknown; event_id?: unknown }) {
  const explicit = String(input.event_id ?? "").trim();
  if (explicit) return explicit;
  const symbol = String(input.symbol ?? "").trim().toUpperCase();
  const signal = String(input.signal ?? "").trim().toUpperCase();
  const bucket = input.t == null ? "now" : String(input.t).trim();
  return `${symbol}:${signal}:${bucket}`;
}

export function validateSignalPayload(body: Record<string, unknown>): { ok: true; payload: SignalPayload } | { ok: false; status: number; error: string } {
  const symbol = String(body.symbol ?? body.ticker ?? "").trim().toUpperCase();
  const signal = String(body.signal ?? body.side ?? "").trim().toUpperCase();
  if (!symbol || (signal !== "BUY" && signal !== "SELL")) return { ok: false, status: 400, error: "Missing symbol/signal" };

  const price = finiteNumber(body.price ?? body.close, "price", true);
  if ("error" in price) return { ok: false, status: 400, error: price.error };
  const rvol = finiteNumber(body.rvol ?? body.relative_volume, "rvol");
  if ("error" in rvol) return { ok: false, status: 400, error: rvol.error };
  const score = finiteNumber(body.score, "score");
  if ("error" in score) return { ok: false, status: 400, error: score.error };

  return {
    ok: true,
    payload: {
      symbol,
      signal: signal as SignalSide,
      price: price.value,
      score: score.value,
      rvol: rvol.value,
      reasons: body.reasons == null ? null : typeof body.reasons === "string" ? body.reasons : JSON.stringify(body.reasons),
      event_id: makeDuplicateEventId({ symbol, signal, t: body.t, event_id: body.event_id }),
      plan: String(body.plan ?? body.tier ?? "FREE").toUpperCase() === "PREMIUM" ? "PREMIUM" : "FREE",
      created_at: body.t ? parseTvTime(body.t) : new Date(),
      timeframe: body.timeframe == null ? null : String(body.timeframe),
      type: body.type == null ? null : String(body.type),
      category: body.category == null ? null : String(body.category),
      exchange: body.exchange == null ? null : String(body.exchange),
      source: body.source == null ? null : String(body.source),
      name: body.name == null ? null : String(body.name),
    },
  };
}

export function riskLevel(score: unknown) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "UNKNOWN";
  if (n >= 75) return "LOW";
  if (n >= 45) return "MEDIUM";
  return "HIGH";
}

export function calculateReturnPercent(side: SignalSide, entry: number, exit: number) {
  if (!Number.isFinite(entry) || !Number.isFinite(exit) || entry <= 0) return null;
  const pct = side === "BUY" ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
  return Number(pct.toFixed(4));
}

export function calculateWinRate<T extends { outcome?: unknown }>(rows: T[]) {
  const decided = rows.filter((r) => r.outcome === "WIN" || r.outcome === "LOSS");
  if (!decided.length) return null;
  return Math.round((decided.filter((r) => r.outcome === "WIN").length / decided.length) * 100);
}

export function sanitizeCsvCell(value: unknown) {
  const s = String(value ?? "");
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function filterSignalFields(payload: SignalPayload) {
  const base = {
    symbol: payload.symbol,
    signal: payload.signal,
    price: payload.price,
    score: payload.score,
    reasons: payload.reasons,
    created_at: payload.created_at,
    event_id: payload.event_id,
  };
  if (payload.plan !== "PREMIUM") return base;
  return { ...base, rvol: payload.rvol, timeframe: payload.timeframe, type: payload.type, category: payload.category, exchange: payload.exchange, source: payload.source, name: payload.name };
}
