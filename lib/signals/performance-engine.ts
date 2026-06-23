import type { OhlcBar } from "@/lib/market-data/provider";

export type SignalDirection = "LONG" | "SHORT";
export type EvaluatedOutcome = "WIN" | "LOSS" | "EXPIRED" | "OPEN";

export type SignalEvaluationInput = {
  direction: SignalDirection;
  entryPrice: number;
  targetPrice?: number | null;
  stopPrice?: number | null;
  bars: OhlcBar[];
  expiresAt?: Date | null;
  now?: Date;
};

export type SignalEvaluationResult = {
  outcome: EvaluatedOutcome;
  returnPct: number | null;
  exitPrice: number | null;
  exitTime: string | null;
  eventType: string | null;
  metadata: Record<string, unknown>;
};

export function calculateLongReturn(entryPrice: number, exitPrice: number) {
  return ((exitPrice - entryPrice) / entryPrice) * 100;
}

export function calculateShortReturn(entryPrice: number, exitPrice: number) {
  return ((entryPrice - exitPrice) / entryPrice) * 100;
}

function calculateReturn(direction: SignalDirection, entryPrice: number, exitPrice: number) {
  return direction === "LONG" ? calculateLongReturn(entryPrice, exitPrice) : calculateShortReturn(entryPrice, exitPrice);
}

function barHitsTarget(direction: SignalDirection, bar: OhlcBar, targetPrice: number) {
  return direction === "LONG" ? bar.high >= targetPrice : bar.low <= targetPrice;
}

function barHitsStop(direction: SignalDirection, bar: OhlcBar, stopPrice: number) {
  return direction === "LONG" ? bar.low <= stopPrice : bar.high >= stopPrice;
}

export function evaluateSignalPerformance(input: SignalEvaluationInput): SignalEvaluationResult {
  const { direction, entryPrice, targetPrice, stopPrice, bars, expiresAt, now = new Date() } = input;

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { outcome: "OPEN", returnPct: null, exitPrice: null, exitTime: null, eventType: null, metadata: { reason: "invalid_entry_price" } };
  }

  for (const bar of bars) {
    const hitTarget = targetPrice != null && barHitsTarget(direction, bar, targetPrice);
    const hitStop = stopPrice != null && barHitsStop(direction, bar, stopPrice);

    if (hitStop) {
      const ambiguous = Boolean(hitTarget);
      return {
        outcome: "LOSS",
        returnPct: calculateReturn(direction, entryPrice, stopPrice!),
        exitPrice: stopPrice!,
        exitTime: bar.time,
        eventType: "STOP_HIT",
        metadata: ambiguous ? { ambiguous_intrabar: true } : {},
      };
    }

    if (hitTarget) {
      return {
        outcome: "WIN",
        returnPct: calculateReturn(direction, entryPrice, targetPrice!),
        exitPrice: targetPrice!,
        exitTime: bar.time,
        eventType: "TARGET_HIT",
        metadata: {},
      };
    }
  }

  if (expiresAt && now >= expiresAt) {
    const lastBar = bars[bars.length - 1];
    const exitPrice = lastBar?.close ?? null;
    return {
      outcome: "EXPIRED",
      returnPct: exitPrice == null ? null : calculateReturn(direction, entryPrice, exitPrice),
      exitPrice,
      exitTime: lastBar?.time ?? now.toISOString(),
      eventType: "EXPIRED",
      metadata: {},
    };
  }

  return { outcome: "OPEN", returnPct: null, exitPrice: null, exitTime: null, eventType: null, metadata: {} };
}
