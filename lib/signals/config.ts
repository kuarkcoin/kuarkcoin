export const TIMEFRAME_EXPIRATION_MS: Record<string, number> = {
  "1m": 30 * 60 * 1000,
  "3m": 90 * 60 * 1000,
  "5m": 2 * 60 * 60 * 1000,
  "15m": 6 * 60 * 60 * 1000,
  "30m": 12 * 60 * 60 * 1000,
  "1h": 24 * 60 * 60 * 1000,
  "2h": 2 * 24 * 60 * 60 * 1000,
  "4h": 4 * 24 * 60 * 60 * 1000,
  "1d": 10 * 24 * 60 * 60 * 1000,
  "1w": 12 * 7 * 24 * 60 * 60 * 1000,
};

export const DEFAULT_TIMEFRAME = "1d";
export const DEFAULT_EXPIRATION_MS = TIMEFRAME_EXPIRATION_MS[DEFAULT_TIMEFRAME];

export function getTimeframeExpirationMs(timeframe?: string | null) {
  if (!timeframe) return DEFAULT_EXPIRATION_MS;
  return TIMEFRAME_EXPIRATION_MS[timeframe.toLowerCase()] ?? DEFAULT_EXPIRATION_MS;
}
