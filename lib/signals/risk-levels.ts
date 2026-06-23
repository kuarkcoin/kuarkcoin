export type PositionMode = "LONG" | "SHORT" | "LONG_EXIT" | (string & {});
export type SignalSide = "BUY" | "SELL" | (string & {});

export type RiskLevelsInput = {
  signal: SignalSide | null | undefined;
  position_mode: PositionMode | null | undefined;
  market: string | null | undefined;
  price: number | null | undefined;
  entry_price: number | null | undefined;
  atr: number | null | undefined;
  stop_price: number | null | undefined;
  target_1: number | null | undefined;
  target_2: number | null | undefined;
  target_3: number | null | undefined;
  atrMultiplier?: number | null | undefined;
};

export type RiskSide = "LONG" | "SHORT" | "LONG_EXIT" | null;

export type RiskLevels = {
  side: RiskSide;
  entry_price: number | null;
  stop_price: number | null;
  target_1: number | null;
  target_2: number | null;
  target_3: number | null;
  risk_amount: number | null;
  rr1: number | null;
  rr2: number | null;
  rr3: number | null;
};

const DEFAULT_ATR_MULTIPLIER = 2.2;

function asFiniteNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeUpper(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function isBistLongOnlyMarket(market: string | null | undefined): boolean {
  const normalized = normalizeUpper(market);
  return ["BIST", "XU", "XIST", "BORSA_ISTANBUL", "BORSA ISTANBUL", "ISTANBUL"].some((token) =>
    normalized.includes(token),
  );
}

function logInvalidExplicit(field: string, side: Exclude<RiskSide, null>, reason: string) {
  console.warn("risk_levels_invalid_explicit", { field, side, reason });
}

function resolveSide(input: RiskLevelsInput): RiskSide {
  const mode = normalizeUpper(input.position_mode);
  const signal = normalizeUpper(input.signal);

  if (mode === "SHORT") return "SHORT";
  if (mode === "LONG" || mode === "LONG_EXIT") return mode;

  if (signal === "BUY") return "LONG";
  if (signal === "SELL" && isBistLongOnlyMarket(input.market)) return "LONG_EXIT";
  if (signal === "SELL") return "SHORT";

  return null;
}

function isValidStop(side: Exclude<RiskSide, null>, stop: number, entry: number): boolean {
  if (side === "LONG" || side === "LONG_EXIT") return stop < entry;
  return stop > entry;
}

function isValidTarget(side: Exclude<RiskSide, null>, target: number, entry: number, previous: number): boolean {
  if (side === "LONG" || side === "LONG_EXIT") return target > entry && target > previous;
  return target < entry && target < previous;
}

function atrLevels(side: Exclude<RiskSide, null>, entry: number, atr: number, multiplier: number) {
  if (atr <= 0 || multiplier <= 0) return { stop: null, targets: [null, null, null] as const };

  const risk = atr * multiplier;
  if (side === "SHORT") {
    return { stop: entry + risk, targets: [entry - risk, entry - risk * 2, entry - risk * 3] as const };
  }

  return { stop: entry - risk, targets: [entry + risk, entry + risk * 2, entry + risk * 3] as const };
}

function rewardRatio(side: Exclude<RiskSide, null>, entry: number, target: number | null, risk: number | null): number | null {
  if (target === null || risk === null || risk <= 0) return null;
  const reward = side === "SHORT" ? entry - target : target - entry;
  return reward > 0 ? reward / risk : null;
}

export function calculateRiskLevels(input: RiskLevelsInput): RiskLevels {
  const side = resolveSide(input);
  const entry = asFiniteNumber(input.entry_price) ?? asFiniteNumber(input.price);

  if (side === null || entry === null) {
    return { side, entry_price: entry, stop_price: null, target_1: null, target_2: null, target_3: null, risk_amount: null, rr1: null, rr2: null, rr3: null };
  }

  const atr = asFiniteNumber(input.atr);
  const multiplier = asFiniteNumber(input.atrMultiplier) ?? DEFAULT_ATR_MULTIPLIER;
  const computed = atr === null ? { stop: null, targets: [null, null, null] as const } : atrLevels(side, entry, atr, multiplier);

  const explicitStop = asFiniteNumber(input.stop_price);
  let stop = explicitStop ?? computed.stop;
  if (explicitStop !== null && !isValidStop(side, explicitStop, entry)) {
    logInvalidExplicit("stop_price", side, "stop_not_on_risk_side_of_entry");
    stop = null;
  }

  const explicitTargets = [asFiniteNumber(input.target_1), asFiniteNumber(input.target_2), asFiniteNumber(input.target_3)] as const;
  const targets: Array<number | null> = [];
  let previous = entry;

  explicitTargets.forEach((explicitTarget, index) => {
    const fallback = computed.targets[index];
    let target = explicitTarget ?? fallback;
    if (explicitTarget !== null && !isValidTarget(side, explicitTarget, entry, previous)) {
      logInvalidExplicit(`target_${index + 1}`, side, "target_not_ordered_beyond_entry");
      target = null;
    }
    targets.push(target);
    if (target !== null) previous = target;
  });

  const riskAmount = stop !== null ? Math.abs(entry - stop) : null;

  return {
    side,
    entry_price: entry,
    stop_price: stop,
    target_1: targets[0] ?? null,
    target_2: targets[1] ?? null,
    target_3: targets[2] ?? null,
    risk_amount: riskAmount,
    rr1: rewardRatio(side, entry, targets[0] ?? null, riskAmount),
    rr2: rewardRatio(side, entry, targets[1] ?? null, riskAmount),
    rr3: rewardRatio(side, entry, targets[2] ?? null, riskAmount),
  };
}

export { DEFAULT_ATR_MULTIPLIER };
