import { describe, expect, it } from "vitest";
import { normalizeSignalIndicators } from "./normalize-signal-indicators";

describe("normalizeSignalIndicators", () => {
  it("keeps plain string reasons", () => {
    expect(normalizeSignalIndicators("RSI breakout")).toEqual(["RSI breakout"]);
  });

  it("parses JSON string reasons", () => {
    expect(normalizeSignalIndicators('{"label":"MACD"}')).toEqual(["MACD"]);
  });

  it("normalizes string arrays", () => {
    expect(normalizeSignalIndicators(["RSI", " Volume "])).toEqual(["RSI", "Volume"]);
  });

  it("normalizes object arrays", () => {
    expect(normalizeSignalIndicators([{ label: "RSI" }, { reason: "Volume" }, { name: "MACD" }])).toEqual(["RSI", "Volume", "MACD"]);
  });

  it("returns an empty list for null", () => {
    expect(normalizeSignalIndicators(null)).toEqual([]);
  });

  it("falls back to plain text for malformed JSON", () => {
    expect(normalizeSignalIndicators('["RSI"')).toEqual(['["RSI"']);
  });
});
