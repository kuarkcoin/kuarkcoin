export type SignalOutcome = "WIN" | "LOSS" | "BREAKEVEN" | "OPEN" | "CANCELLED" | "EXPIRED" | string;

export type SignalStatsRow = {
  id?: number | string | null;
  symbol?: string | null;
  timeframe?: string | null;
  outcome?: SignalOutcome | null;
  status?: SignalOutcome | null;
  return_pct?: number | string | null;
  returnPercent?: number | string | null;
  pnl_pct?: number | string | null;
  pnlPercent?: number | string | null;
  pnl?: number | string | null;
  target_hit?: boolean | string | number | null;
  stop_hit?: boolean | string | number | null;
  targetHit?: boolean | string | number | null;
  stopHit?: boolean | string | number | null;
};

export type SignalStatsBreakdown = Omit<SignalStats, "symbols" | "timeframes"> & { key: string };

export type SignalStats = {
  total: number;
  closed: number;
  open: number;
  win: number;
  loss: number;
  breakeven: number;
  winRate: number | null;
  averageReturn: number | null;
  medianReturn: number | null;
  profitFactor: number | null;
  expectedValue: number | null;
  drawdown: number | null;
  targetRatio: number | null;
  stopRatio: number | null;
  symbols: SignalStatsBreakdown[];
  timeframes: SignalStatsBreakdown[];
  sampleWarning?: "Sınırlı örneklem";
};

const CLOSED_OUTCOMES = new Set(["WIN", "LOSS", "BREAKEVEN"]);
const NON_DECISION_OUTCOMES = new Set(["OPEN", "CANCELLED", "EXPIRED"]);

function upper(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function booleanish(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const normalized = upper(value);
  if (["TRUE", "1", "YES", "Y"].includes(normalized)) return true;
  if (["FALSE", "0", "NO", "N"].includes(normalized)) return false;
  return null;
}

function outcomeOf(row: SignalStatsRow) {
  const raw = upper(row.outcome ?? row.status);
  return raw || "OPEN";
}

function returnOf(row: SignalStatsRow) {
  return finiteNumber(row.return_pct ?? row.returnPercent ?? row.pnl_pct ?? row.pnlPercent ?? row.pnl);
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function maxDrawdown(returns: number[]) {
  if (returns.length === 0) return null;
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const value of returns) {
    equity += value;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
  }
  return maxDd;
}

function baseStats(rows: SignalStatsRow[]): Omit<SignalStats, "symbols" | "timeframes"> {
  const outcomes = rows.map(outcomeOf);
  const closedRows = rows.filter((row) => CLOSED_OUTCOMES.has(outcomeOf(row)));
  const denominatorRows = rows.filter((row) => !NON_DECISION_OUTCOMES.has(outcomeOf(row)));
  const returns = closedRows.map(returnOf).filter((value): value is number => value !== null);
  const positiveReturns = returns.filter((value) => value > 0);
  const negativeReturns = returns.filter((value) => value < 0);
  const grossProfit = positiveReturns.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(negativeReturns.reduce((sum, value) => sum + value, 0));
  const targetHits = closedRows.filter((row) => booleanish(row.target_hit ?? row.targetHit) === true).length;
  const stopHits = closedRows.filter((row) => booleanish(row.stop_hit ?? row.stopHit) === true).length;
  const closed = closedRows.length;
  const win = outcomes.filter((outcome) => outcome === "WIN").length;

  const stats: Omit<SignalStats, "symbols" | "timeframes"> = {
    total: rows.length,
    closed,
    open: outcomes.filter((outcome) => outcome === "OPEN").length,
    win,
    loss: outcomes.filter((outcome) => outcome === "LOSS").length,
    breakeven: outcomes.filter((outcome) => outcome === "BREAKEVEN").length,
    winRate: ratio(win, denominatorRows.length),
    averageReturn: average(returns),
    medianReturn: median(returns),
    profitFactor: grossLoss === 0 ? (grossProfit === 0 ? null : grossProfit / grossLoss) : grossProfit / grossLoss,
    expectedValue: average(returns),
    drawdown: maxDrawdown(returns),
    targetRatio: ratio(targetHits, closed),
    stopRatio: ratio(stopHits, closed),
  };

  if (closed < 20) stats.sampleWarning = "Sınırlı örneklem";
  return stats;
}

function breakdown(rows: SignalStatsRow[], key: "symbol" | "timeframe"): SignalStatsBreakdown[] {
  const groups = new Map<string, SignalStatsRow[]>();
  for (const row of rows) {
    const groupKey = String(row[key] ?? "Bilinmiyor").trim() || "Bilinmiyor";
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
  }
  return Array.from(groups.entries())
    .map(([groupKey, groupRows]) => ({ key: groupKey, ...baseStats(groupRows) }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

export function calculateSignalStats(rows: SignalStatsRow[]): SignalStats {
  return {
    ...baseStats(rows),
    symbols: breakdown(rows, "symbol"),
    timeframes: breakdown(rows, "timeframe"),
  };
}
