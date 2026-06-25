import assert from "node:assert/strict";
import { normalizeSignalPayload } from "../lib/signals.ts";
import { normalizeMarketSymbol } from "../lib/symbols.ts";
import { requireWebhookSecret } from "../lib/server-auth.ts";
import { GET, POST } from "../app/api/signals/route.ts";
import { setSignalsSupabaseFactory, resetSignalsSupabaseFactory } from "../app/api/signals/supabaseFactory.ts";


async function assertHealthEnv(
  env: { scan?: string; supabaseUrl?: string; publicSupabaseUrl?: string; serviceKey?: string },
  expected: { webhookConfigured: boolean; supabaseConfigured: boolean },
) {
  const previous = {
    scan: process.env.SCAN_SECRET,
    supabaseUrl: process.env.SUPABASE_URL,
    publicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  try {
    if (env.scan === undefined) delete process.env.SCAN_SECRET;
    else process.env.SCAN_SECRET = env.scan;
    if (env.supabaseUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = env.supabaseUrl;
    if (env.publicSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = env.publicSupabaseUrl;
    if (env.serviceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = env.serviceKey;

    setSignalsSupabaseFactory(() => { throw new Error("health must not create supabase client"); });
    const res = await GET(new Request("https://example.com/api/signals?scope=health"));
    const json = await res.json();
    assert.equal(res.status, 200, "health status 200");
    assert.deepEqual(json, { ok: true, ...expected });
  } finally {
    resetSignalsSupabaseFactory();
    if (previous.scan === undefined) delete process.env.SCAN_SECRET;
    else process.env.SCAN_SECRET = previous.scan;
    if (previous.supabaseUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previous.supabaseUrl;
    if (previous.publicSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous.publicSupabaseUrl;
    if (previous.serviceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.serviceKey;
  }
}

await assertHealthEnv(
  { scan: "top-secret", supabaseUrl: "https://example.supabase.co", serviceKey: "service-role" },
  { webhookConfigured: true, supabaseConfigured: true },
);
await assertHealthEnv(
  { supabaseUrl: "https://example.supabase.co", serviceKey: "service-role" },
  { webhookConfigured: false, supabaseConfigured: true },
);
await assertHealthEnv(
  { scan: "top-secret" },
  { webhookConfigured: true, supabaseConfigured: false },
);

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
assert.deepEqual(normalizeMarketSymbol("UNKNOWN123")?.providerSymbol, "UNKNOWN123");

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

function createSupabaseMock(opts: { existing?: unknown[]; selectError?: unknown; insertError?: unknown } = {}) {
  const eqs: Array<[string, unknown]> = [];
  const inserted: unknown[] = [];
  return {
    eqs,
    inserted,
    client: {
      from() {
        return {
          select() { return this; },
          eq(column: string, value: unknown) { eqs.push([column, value]); return this; },
          is(column: string, value: unknown) { eqs.push([column, value]); return this; },
          gte() { return this; },
          insert(rows: unknown[]) { inserted.push(...rows); return { select() { return this; }, single: async () => ({ data: rows[0], error: opts.insertError ?? null }) }; },
          limit: async () => ({ data: opts.existing ?? [], error: opts.selectError ?? null }),
        };
      },
    },
  };
}

function request(body: BodyInit, contentType: string) {
  return new Request("https://example.com/api/signals", { method: "POST", headers: { "content-type": contentType }, body });
}

async function postWithMock(body: BodyInit, contentType: string, opts: Parameters<typeof createSupabaseMock>[0] = {}) {
  const mock = createSupabaseMock(opts);
  setSignalsSupabaseFactory(() => mock.client as never);
  try {
    const res = await POST(request(body, contentType));
    const json = await res.json();
    return { res, json, mock };
  } finally {
    resetSignalsSupabaseFactory();
  }
}

const jsonBody = { secret: "top-secret", ticker: "BINANCE:BTCUSDT", action: "LONG", close: 65000, score: 85, interval: "4H" };
let actual = await postWithMock(JSON.stringify(jsonBody), "application/json");
assert.equal(actual.res.status, 200, "application/json başarılı insert 200/201");
assert.equal(actual.json.ok, true);
assert.equal(actual.mock.inserted.length, 1);
assert.deepEqual(actual.mock.eqs.find(([k]) => k === "timeframe"), ["timeframe", "4H"], "duplicate kontrolünde timeframe var");

actual = await postWithMock(JSON.stringify(jsonBody), "text/plain");
assert.equal(actual.res.status, 200, "text/plain JSON 200");

const lineBody = "secret=top-secret\nticker=BINANCE%3ABTCUSDT\naction=LONG\nclose=65000\nscore=85\ninterval=4H\n";
actual = await postWithMock(lineBody, "text/plain");
assert.equal(actual.res.status, 200, "text/plain satır satır key=value 200");
assert.equal(actual.json.ok, true);

actual = await postWithMock("secret=top-secret&ticker=BINANCE%3ABTCUSDT&action=LONG&close=65000&score=85&interval=4H", "text/plain");
assert.equal(actual.res.status, 200, "text/plain & key=value 200");

actual = await postWithMock("secret=top-secret&ticker=BINANCE%3ABTCUSDT&action=LONG&close=65000&score=85&interval=4H", "application/x-www-form-urlencoded");
assert.equal(actual.res.status, 200, "form-urlencoded 200");

actual = await postWithMock(JSON.stringify({ ...jsonBody, secret: "wrong" }), "application/json");
assert.equal(actual.res.status, 401, "yanlış secret 401");

actual = await postWithMock(JSON.stringify({ secret: "top-secret", action: "LONG", close: 65000 }), "application/json");
assert.equal(actual.res.status, 400, "eksik symbol 400");

actual = await postWithMock(JSON.stringify({ secret: "top-secret", ticker: "BTCUSDT", action: "LONG", close: 0 }), "application/json");
assert.equal(actual.res.status, 400, "geçersiz price 400");

actual = await postWithMock(JSON.stringify(jsonBody), "application/json", { existing: [{ id: 1 }] });
assert.equal(actual.res.status, 200, "duplicate response 200");
assert.equal(actual.json.duplicate, true);
assert.equal(actual.mock.inserted.length, 0);

actual = await postWithMock(JSON.stringify(jsonBody), "application/json", { selectError: { message: "select failed" } });
assert.equal(actual.res.status, 500, "select hatası 500");

actual = await postWithMock(JSON.stringify(jsonBody), "application/json", { insertError: { message: "insert failed" } });
assert.equal(actual.res.status, 500, "insert hatası 500");

console.log("webhook validation ok");
