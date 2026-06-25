import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clampAiScore } from "../lib/ai-utils.ts";
const auth = readFileSync("lib/server-auth.ts", "utf8");
assert.match(auth, /Webhook is not configured/);
assert.match(auth, /providedSecret \|\| providedSecret !== expectedSecret/);
assert.match(auth, /Admin API is not configured/);
assert.match(auth, /authHeader !== `Bearer \$\{cronSecret\}`/);
assert.equal(clampAiScore(99), 10);
assert.equal(clampAiScore(-99), -10);

const signalsRoute = readFileSync("app/api/signals/route.ts", "utf8");
assert.match(signalsRoute, /const rawPrice = body\.price;/);
assert.match(signalsRoute, /const price = Number\(rawPrice\);/);
assert.match(signalsRoute, /rawPrice == null \|\| !Number\.isFinite\(price\).*Invalid price/);
assert.match(signalsRoute, /price <= 0.*price must be a positive number/);
console.log("security validation ok");
