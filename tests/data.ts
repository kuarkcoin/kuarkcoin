import assert from "node:assert/strict";
import { BIST100, ETFS, EXPECTED_UNIVERSE_COUNTS, NASDAQ100, NASDAQ300 } from "../constants/universe.ts";

function check(name: keyof typeof EXPECTED_UNIVERSE_COUNTS, list: string[], market: "BIST" | "US" | "ETF") {
  assert.equal(list.length, EXPECTED_UNIVERSE_COUNTS[name], `${name} count`);
  assert.equal(new Set(list).size, list.length, `${name} duplicates`);
  assert.equal(list.every((s) => /^[A-Z0-9.]+$/.test(s) && s.length > 0), true, `${name} invalid symbol`);
  if (market === "BIST") assert.equal(list.includes("TTWO"), false, "BIST must not include TTWO");
  if (market === "US") assert.equal(list.includes("CLEBI"), false, "US list must not include CLEBI");
}
check("BIST100", BIST100, "BIST");
check("NASDAQ100", NASDAQ100, "US");
check("NASDAQ300", NASDAQ300, "US");
check("ETFS", ETFS, "ETF");
console.log("data validation ok");
