export type HeatmapSignalRow = { symbol: string; signal?: string | null; score?: number | null; created_at?: string | null; reasons?: unknown };
export type HeatmapFilters = { signal?: "ALL" | "BUY" | "SELL"; minScore?: number; since?: Date; indicator?: string; limit?: number };

export function selectHeatmapSignals(rows: HeatmapSignalRow[], filters: HeatmapFilters = {}) {
  const signal = filters.signal ?? "ALL";
  const minScore = filters.minScore ?? 0;
  const indicator = filters.indicator?.toLowerCase();

  return [...rows]
    .filter((row) => {
      if (signal !== "ALL" && String(row.signal ?? "").toUpperCase() !== signal) return false;
      if (Number(row.score ?? 0) < minScore) return false;
      if (filters.since) {
        const date = row.created_at ? new Date(row.created_at) : null;
        if (!date || Number.isNaN(date.getTime()) || date < filters.since) return false;
      }
      if (indicator) {
        const haystack = JSON.stringify(row.reasons ?? "").toLowerCase();
        if (!haystack.includes(indicator)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const scoreDiff = Number(b.score ?? 0) - Number(a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    })
    .slice(0, filters.limit ?? rows.length);
}
