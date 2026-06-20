import { describe, expect, it } from "vitest";
import { selectHeatmapSignals, type HeatmapSignalRow } from "./signal-heatmap";

const rows: HeatmapSignalRow[] = [
  { symbol: "AAA", signal: "BUY", score: 70, created_at: "2026-06-19T10:00:00Z", reasons: ["RSI"] },
  { symbol: "BBB", signal: "SELL", score: 95, created_at: "2026-06-18T10:00:00Z", reasons: ["MACD"] },
  { symbol: "CCC", signal: "BUY", score: 95, created_at: "2026-06-19T11:00:00Z", reasons: ["Volume"] },
];

describe("selectHeatmapSignals", () => {
  it("uses newest signal as a tie-breaker", () => {
    expect(selectHeatmapSignals(rows).map((row) => row.symbol).slice(0, 2)).toEqual(["CCC", "BBB"]);
  });

  it("selects the strongest signals first", () => {
    expect(selectHeatmapSignals(rows, { limit: 1 })[0]?.score).toBe(95);
  });

  it("filters by time", () => {
    expect(selectHeatmapSignals(rows, { since: new Date("2026-06-19T00:00:00Z") }).map((row) => row.symbol)).toEqual(["CCC", "AAA"]);
  });

  it("filters by indicator", () => {
    expect(selectHeatmapSignals(rows, { indicator: "macd" }).map((row) => row.symbol)).toEqual(["BBB"]);
  });
});
