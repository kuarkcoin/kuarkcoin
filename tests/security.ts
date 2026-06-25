import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { clampAiScore } from "../lib/ai-utils.ts";
const auth = readFileSync("lib/server-auth.ts", "utf8");
const signalsRoute = readFileSync("app/api/signals/route.ts", "utf8");
assert.match(auth, /Webhook is not configured/);
assert.match(auth, /providedSecret \|\| providedSecret !== expectedSecret/);
assert.match(auth, /Admin API is not configured/);
assert.match(auth, /authHeader !== `Bearer \$\{cronSecret\}`/);
assert.equal(clampAiScore(99), 10);
assert.equal(clampAiScore(-99), -10);

assert.match(signalsRoute, /export function normalizeSignalValue\(raw: unknown\)/);
assert.match(signalsRoute, /String\(raw\)\.trim\(\)\.toUpperCase\(\)/);
assert.match(signalsRoute, /\["BUY", "AL", "LONG", "STRONG_BUY", "BULLISH"\]/);
assert.match(signalsRoute, /\["SELL", "SAT", "SHORT", "STRONG_SELL", "BEARISH"\]/);
assert.match(signalsRoute, /const signal = normalizeSignalValue\(body\.signal \?\? body\.type\)/);
assert.match(signalsRoute, /if \(!signal\) return \{ ok: false as const, error: "Invalid signal" \}/);

const normalizeSource = signalsRoute
  .slice(signalsRoute.indexOf("export function normalizeSignalValue"), signalsRoute.indexOf("function cleanText"))
  .replace("export function", "function")
  .replace("raw: unknown", "raw")
  .replace(": NormalizedSignal", "");
const context = vm.createContext({ String });
vm.runInContext(`${normalizeSource}; this.normalizeSignalValue = normalizeSignalValue;`, context);
const normalizeSignalValue = context.normalizeSignalValue as (raw: unknown) => "BUY" | "SELL" | null;
assert.equal(normalizeSignalValue("AL"), "BUY", "JSON AL should normalize to BUY");
assert.equal(normalizeSignalValue("LONG"), "BUY", "LONG should normalize to BUY");
for (const variant of ["SELL", "SAT", "SHORT"]) assert.equal(normalizeSignalValue(variant), "SELL", `${variant} should normalize to SELL`);
assert.equal(normalizeSignalValue("HOLD"), null);
console.log("security validation ok");
