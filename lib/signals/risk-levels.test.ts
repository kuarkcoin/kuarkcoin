import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateRiskLevels } from "./risk-levels";

const baseInput = {
  signal: "BUY",
  position_mode: null,
  market: "NASDAQ",
  price: 100,
  entry_price: 100,
  atr: 5,
  stop_price: null,
  target_1: null,
  target_2: null,
  target_3: null,
};

describe("calculateRiskLevels", () => {
  it("uses valid explicit LONG stop and targets before ATR", () => {
    const levels = calculateRiskLevels({
      ...baseInput,
      stop_price: 94,
      target_1: 110,
      target_2: 120,
      target_3: 130,
    });

    assert.equal(levels.side, "LONG");
    assert.equal(levels.stop_price, 94);
    assert.equal(levels.risk_amount, 6);
    assert.equal(levels.rr1, 10 / 6);
    assert.equal(levels.rr2, 20 / 6);
    assert.equal(levels.rr3, 30 / 6);
  });

  it("falls back to default ATR levels when explicit payload levels are absent", () => {
    const levels = calculateRiskLevels(baseInput);

    assert.equal(levels.stop_price, 89);
    assert.equal(levels.target_1, 111);
    assert.equal(levels.target_2, 122);
    assert.equal(levels.target_3, 133);
    assert.equal(levels.risk_amount, 11);
    assert.equal(levels.rr1, 1);
    assert.equal(levels.rr2, 2);
    assert.equal(levels.rr3, 3);
  });

  it("nulls inconsistent explicit levels without throwing", () => {
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args);

    try {
      const levels = calculateRiskLevels({
        ...baseInput,
        atr: null,
        stop_price: 101,
        target_1: 99,
        target_2: 120,
        target_3: 115,
      });

      assert.equal(levels.stop_price, null);
      assert.equal(levels.target_1, null);
      assert.equal(levels.target_2, 120);
      assert.equal(levels.target_3, null);
      assert.equal(levels.risk_amount, null);
      assert.equal(levels.rr2, null);
      assert.equal(warnings.length, 3);
      assert.ok(warnings.every(([event]) => event === "risk_levels_invalid_explicit"));
    } finally {
      console.warn = originalWarn;
    }
  });

  it("does not auto-generate SHORT levels for BIST SELL unless position_mode is explicitly SHORT", () => {
    const longExit = calculateRiskLevels({ ...baseInput, signal: "SELL", market: "BIST", position_mode: null });
    assert.equal(longExit.side, "LONG_EXIT");
    assert.equal(longExit.stop_price, 89);
    assert.equal(longExit.target_1, 111);

    const explicitShort = calculateRiskLevels({ ...baseInput, signal: "SELL", market: "BIST", position_mode: "SHORT" });
    assert.equal(explicitShort.side, "SHORT");
    assert.equal(explicitShort.stop_price, 111);
    assert.equal(explicitShort.target_1, 89);
    assert.equal(explicitShort.rr1, 1);
  });
});
