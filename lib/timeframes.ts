export function normalizeTimeframe(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export function isPremiumTimeframe(value: unknown) {
  if (value === 240) return true;

  const timeframe = normalizeTimeframe(value);
  return timeframe === "240" || timeframe === "4H";
}

export function isDailyTimeframe(value: unknown) {
  const timeframe = normalizeTimeframe(value);
  return timeframe === "1D" || timeframe === "D";
}
