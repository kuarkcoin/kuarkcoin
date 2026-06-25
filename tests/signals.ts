import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/signals/route.ts", "utf8");

assert.match(route, /function pickFirst<T extends Record<string, unknown>>/);
assert.match(route, /const normalized = normalizeSignalPayload\(body\);/);
assert.match(route, /symbol: pickFirst\(body, \["symbol", "ticker", "tickerid", "instrument", "market"\]/);
assert.match(route, /signal: pickFirst\(body, \["signal", "action", "side", "direction", "order_action", "type"\]/);
assert.match(route, /price: pickFirst\(body, \["price", "close", "entry_price", "fill_price", "entryPrice"\]/);
assert.match(route, /score: pickFirst\(body, \["score", "strength", "puan", "rating", "confidence"\]/);
assert.match(route, /timeframe: pickFirst\(body, \["timeframe", "interval", "tf", "period"\]/);
assert.match(route, /symbol: norm\.providerSymbol, signal, price, score, reasons: cleanText\(normalized\.reasons, 1000\), timeframe, created_at/);

const aliasPayloadFields = ["ticker", "action", "close", "interval"];
for (const field of aliasPayloadFields) {
  assert.match(route, new RegExp(`"${field}"`), `${field} alias must be normalized before validation`);
}

console.log("signals normalization validation ok");
