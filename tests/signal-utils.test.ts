import { describe, expect, it } from "vitest";
import { calculateReturnPercent, calculateWinRate, checkScanSecret, filterSignalFields, makeDuplicateEventId, riskLevel, sanitizeCsvCell, validateSignalPayload } from "@/lib/signal-utils";
import { normalizeSignalIndicators } from "@/lib/normalize-signal-indicators";

describe("signal utils", () => {
  it("validates legacy and extended payloads", () => {
    expect(validateSignalPayload({ symbol: "aapl", signal: "buy", price: "10" })).toMatchObject({ ok: true, payload: { symbol: "AAPL", signal: "BUY", price: 10, plan: "FREE" } });
    expect(validateSignalPayload({ ticker: "msft", side: "sell", close: 20, relative_volume: "2.5", tier: "premium" })).toMatchObject({ ok: true, payload: { symbol: "MSFT", signal: "SELL", price: 20, rvol: 2.5, plan: "PREMIUM" } });
    expect(validateSignalPayload({ symbol: "AAPL", signal: "BUY", price: "bad" })).toMatchObject({ ok: false, status: 400 });
  });

  it("checks configured scan secret", () => {
    expect(checkScanSecret("x", undefined)).toMatchObject({ ok: false, status: 503 });
    expect(checkScanSecret("x", "y")).toMatchObject({ ok: false, status: 401 });
    expect(checkScanSecret("x", "x")).toEqual({ ok: true });
  });

  it("generates stable duplicate event ids", () => {
    expect(makeDuplicateEventId({ symbol: "aapl", signal: "buy", t: 123 })).toBe("AAPL:BUY:123");
    expect(makeDuplicateEventId({ symbol: "aapl", signal: "buy", event_id: "tv-1" })).toBe("tv-1");
  });

  it("normalizes indicators", () => {
    expect(normalizeSignalIndicators("RSI bullish divergence, VOL_UP")).toEqual([
      { name: "RSI", detail: "Boğa uyumsuzluğu", category: "bullish" },
      { name: "Volume", detail: null, category: null },
    ]);
  });

  it("maps risk levels", () => {
    expect(riskLevel(80)).toBe("LOW");
    expect(riskLevel(55)).toBe("MEDIUM");
    expect(riskLevel(20)).toBe("HIGH");
    expect(riskLevel("x")).toBe("UNKNOWN");
  });

  it("calculates LONG and SHORT returns", () => {
    expect(calculateReturnPercent("BUY", 100, 110)).toBe(10);
    expect(calculateReturnPercent("SELL", 100, 90)).toBe(10);
  });

  it("excludes undecided rows from win-rate", () => {
    expect(calculateWinRate([{ outcome: "WIN" }, { outcome: "LOSS" }, { outcome: null }])).toBe(50);
    expect(calculateWinRate([{ outcome: null }])).toBeNull();
  });

  it("sanitizes CSV injection prefixes", () => {
    expect(sanitizeCsvCell("=cmd")).toBe("'=cmd");
    expect(sanitizeCsvCell("safe")).toBe("safe");
  });

  it("filters free and premium fields", () => {
    const payload = validateSignalPayload({ symbol: "AAPL", signal: "BUY", price: 10, rvol: 3, tier: "premium", timeframe: "1h" });
    if (!payload.ok) throw new Error("expected valid");
    expect(filterSignalFields({ ...payload.payload, plan: "FREE" })).not.toHaveProperty("rvol");
    expect(filterSignalFields(payload.payload)).toMatchObject({ rvol: 3, timeframe: "1h" });
  });
});
