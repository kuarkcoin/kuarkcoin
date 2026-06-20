type RawSignalRecord = Record<string, unknown>;

export type HeatmapSignal = {
  id: string | number | null;
  symbol: string;
  signal: string;
  price: number | null;
  score: number | null;
  created_at: string | null;
  indicators: string[];
};

const INDICATOR_SOURCE_KEYS = [
  "indicators",
  "indicator_names",
  "conditions",
  "signal_reasons",
  "reasons",
] as const;

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed || !(trimmed.startsWith("[") || trimmed.startsWith("{"))) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeIndicatorValue(value: unknown): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeIndicatorValue(item));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => enabled !== false && enabled != null && enabled !== "")
      .flatMap(([key, enabled]) => {
        if (typeof enabled === "string" && enabled.trim() && enabled.trim() !== "true") {
          return normalizeIndicatorValue(enabled);
        }

        return normalizeIndicatorValue(key);
      });
  }

  if (typeof value === "string") {
    const parsed = parseJsonString(value);
    if (parsed !== value) return normalizeIndicatorValue(parsed);

    return value
      .split(/[;,|\n]/)
      .map(normalizeToken)
      .filter(Boolean);
  }

  return [normalizeToken(value)].filter(Boolean);
}

export function normalizeSignalIndicators(raw: RawSignalRecord): string[] {
  const seen = new Set<string>();
  const indicators: string[] = [];

  for (const key of INDICATOR_SOURCE_KEYS) {
    for (const indicator of normalizeIndicatorValue(raw[key])) {
      const dedupeKey = indicator.toLocaleLowerCase("tr-TR");
      if (seen.has(dedupeKey)) continue;

      seen.add(dedupeKey);
      indicators.push(indicator);
    }
  }

  return indicators;
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function mapSignalToHeatmap(raw: RawSignalRecord): HeatmapSignal {
  return {
    id: (raw.id as string | number | null | undefined) ?? null,
    symbol: normalizeToken(raw.symbol),
    signal: normalizeToken(raw.signal).toUpperCase(),
    price: numberOrNull(raw.price),
    score: numberOrNull(raw.score),
    created_at: raw.created_at == null ? null : normalizeToken(raw.created_at),
    indicators: normalizeSignalIndicators(raw),
  };
}

export function mapSignalsToHeatmap(rows: RawSignalRecord[] | null | undefined): HeatmapSignal[] {
  return (rows ?? []).map(mapSignalToHeatmap);
}
