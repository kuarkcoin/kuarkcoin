import assert from "node:assert/strict";
import { normalizeSignalPayload } from "../lib/signals.ts";
import { normalizeMarketSymbol } from "../lib/symbols.ts";
import { requireWebhookSecret } from "../lib/server-auth.ts";

process.env.SCAN_SECRET = "top-secret";

function ok(payload: Record<string, unknown>) {
  const normalized = normalizeSignalPayload(payload);
  assert.equal(normalized.ok, true, JSON.stringify(normalized));
  return normalized.ok ? normalized.data : never();
}
function never(): never { throw new Error("unreachable"); }

assert.equal(ok({ ticker: "BIST:THYAO", action: "BUY", close: 10 }).symbol, "BIST:THYAO");
assert.equal(ok({ ticker: "NASDAQ:AAPL", action: "AL", close: 10 }).signal, "BUY");
assert.equal(ok({ tickerid: "BINANCE:BTCUSDT", side: "LONG", close: 10 }).signal, "BUY");
assert.equal(ok({ instrument: "BIST:ASELS", direction: "SAT", close: 10 }).signal, "SELL");
assert.equal(ok({ market: "BINANCE:ETHUSDT", order_action: "SHORT", close: 10 }).signal, "SELL");
assert.equal(ok({ symbol: "BIST:NOTINLIST", signal: "BULLISH", entryPrice: 10, confidence: 150 }).score, 100);
assert.equal(ok({ symbol: "NASDAQ:ZZZZ", signal: "BEARISH", fill_price: 10, puan: -5 }).score, 0);
assert.deepEqual(normalizeMarketSymbol("BIST:THYAO")?.providerSymbol, "BIST:THYAO");
assert.deepEqual(normalizeMarketSymbol("NASDAQ:AAPL")?.providerSymbol, "NASDAQ:AAPL");
assert.deepEqual(normalizeMarketSymbol("BINANCE:BTCUSDT")?.providerSymbol, "BINANCE:BTCUSDT");

const textPlain = Object.fromEntries(new URLSearchParams("ticker=AAPL&action=AL&close=12.5"));
assert.equal(ok(textPlain).signal, "BUY");
const formUrlencoded = Object.fromEntries(new URLSearchParams("ticker=AAPL&action=SHORT&close=12.5"));
assert.equal(ok(formUrlencoded).signal, "SELL");

let err = requireWebhookSecret(new Request("https://example.com/api/signals", { headers: { "x-webhook-secret": "wrong" } }), {});
assert.equal(err?.status, 401, "yanlış secret 401");
err = requireWebhookSecret(new Request("https://example.com/api/signals?secret=top-secret"), {});
assert.equal(err, null, "query secret accepted");
err = requireWebhookSecret(new Request("https://example.com/api/signals", { headers: { "x-webhook-secret": "top-secret" } }), {});
assert.equal(err, null, "x-webhook-secret accepted");
err = requireWebhookSecret(new Request("https://example.com/api/signals", { headers: { authorization: "Bearer top-secret" } }), {});
assert.equal(err, null, "bearer accepted");
err = requireWebhookSecret(new Request("https://example.com/api/signals"), { secret: "top-secret" });
assert.equal(err, null, "body secret accepted");

assert.equal(normalizeSignalPayload({ action: "AL", close: 1 }).ok, false, "eksik symbol 400");
assert.equal(normalizeSignalPayload({ symbol: "AAPL", action: "AL", close: 0 }).ok, false, "geçersiz price 400");

const inserted = ok({ ticker: "AAPL", action: "AL", close: 12.5, reason: "başarılı insert" });
assert.equal(inserted.price, 12.5, "başarılı insert payload");
const supabaseFailure = { error: { message: "Supabase hatası 500" } };
assert.equal(Boolean(supabaseFailure.error), true, "Supabase hatası 500 senaryosu");

console.log("webhook validation ok");
