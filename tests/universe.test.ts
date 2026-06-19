import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXPECTED_NASDAQ100_SYMBOL_COUNT,
  NASDAQ100,
} from "../constants/universe.js";

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.\-]*$/;

describe("NASDAQ100 universe", () => {
  it("contains only unique symbols", () => {
    assert.equal(new Set(NASDAQ100).size, NASDAQ100.length);
  });

  it("has the expected number of symbols", () => {
    assert.equal(NASDAQ100.length, EXPECTED_NASDAQ100_SYMBOL_COUNT);
  });

  it("contains only valid ticker symbols", () => {
    for (const symbol of NASDAQ100) {
      assert.match(symbol, SYMBOL_PATTERN);
    }
  });
});
