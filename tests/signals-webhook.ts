import assert from "node:assert/strict";
import { postSignals, validateSignalPayload } from "../app/api/signals/route.ts";

const SECRET = "unit-test-secret-never-log";
process.env.SCAN_SECRET = SECRET;

type FakeOptions = { insertError?: boolean; existing?: unknown[] };

function fakeSupabase(options: FakeOptions = {}) {
  return {
    from(table: string) {
      assert.equal(table, "signals");
      return {
        select() { return duplicateQuery(options); },
        insert(rows: unknown[]) { return insertQuery(rows, options); },
      };
    },
  } as never;
}

function duplicateQuery(options: FakeOptions) {
  const query = {
    eq() { return query; },
    gte() { return query; },
    limit() { return Promise.resolve({ data: options.existing ?? [], error: null }); },
  };
  return query;
}

function insertQuery(rows: unknown[], options: FakeOptions) {
  return {
    select() {
      return {
        single() {
          if (options.insertError) return Promise.resolve({ data: null, error: { message: "insert failed" } });
          return Promise.resolve({ data: { id: 1, ...(rows[0] as Record<string, unknown>) }, error: null });
        },
      };
    },
  };
}

function jsonReq(body: Record<string, unknown>, secret = SECRET) {
  return new Request("http://localhost/api/signals", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  });
}

async function post(req: Request, options?: FakeOptions) {
  return postSignals(req, () => fakeSupabase(options));
}

async function assertStatus(req: Request, status: number, options?: FakeOptions) {
  const res = await post(req, options);
  assert.equal(res.status, status);
  return res.json() as Promise<Record<string, unknown>>;
}

const captured: string[] = [];
const originalLog = console.log;
console.log = (...args: unknown[]) => { captured.push(args.map(String).join(" ")); originalLog(...args); };

function assertValidatedSignal(input: Parameters<typeof validateSignalPayload>[0], expected: "BUY" | "SELL") {
  const valid = validateSignalPayload(input);
  assert.equal(valid.ok, true);
  assert.equal(valid.ok && valid.data.signal, expected);
}

assertValidatedSignal({ symbol: "BTCUSDT", signal: "BUY" }, "BUY");
assertValidatedSignal({ symbol: "BTCUSDT", signal: "AL" }, "BUY");
assertValidatedSignal({ symbol: "BTCUSDT", signal: "LONG" }, "BUY");
for (const signal of ["SELL", "SAT", "SHORT"]) {
  const valid = validateSignalPayload({ symbol: "BTCUSDT", signal });
  assert.equal(valid.ok && valid.data.signal, "SELL");
}
{
  const valid = validateSignalPayload({ ticker: "BTCUSDT", action: "BUY", close: "123.45" });
  assert.equal(valid.ok && valid.data.symbol, "BINANCE:BTCUSDT");
  assert.equal(valid.ok && valid.data.price, 123.45);
}

await assertStatus(jsonReq({ symbol: "BTCUSDT", signal: "BUY", price: 1 }), 200);
await assertStatus(jsonReq({ symbol: "BTCUSDT", signal: "AL", price: 1 }), 200);
await assertStatus(jsonReq({ symbol: "BTCUSDT", signal: "LONG", price: 1 }), 200);
for (const signal of ["SELL", "SAT", "SHORT"]) await assertStatus(jsonReq({ symbol: "BTCUSDT", signal, price: 1 }), 200);
await assertStatus(jsonReq({ ticker: "BTCUSDT", action: "SELL", close: "2" }), 200);
await assertStatus(new Request("http://localhost/api/signals", {
  method: "POST",
  headers: { "content-type": "text/plain" },
  body: `secret=${encodeURIComponent(SECRET)}&symbol=BTCUSDT&signal=BUY&price=3`,
}), 200);
await assertStatus(new Request("http://localhost/api/signals", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Bearer ${SECRET}` },
  body: "symbol=BTCUSDT&signal=SELL&price=4",
}), 200);
await assertStatus(jsonReq({ symbol: "BTCUSDT", signal: "BUY" }, "wrong-secret"), 401);
await assertStatus(jsonReq({ signal: "BUY" }), 400);
await assertStatus(jsonReq({ symbol: "BTCUSDT", signal: "BUY", price: "not-a-price" }), 400);
await assertStatus(jsonReq({ symbol: "BTCUSDT", signal: "BUY", price: 1 }), 500, { insertError: true });
await assertStatus(jsonReq({ symbol: "BTCUSDT", signal: "BUY", price: 1 }), 200);

const output = captured.join("\n");
assert.equal(output.includes(SECRET), false, "test output must not include webhook secrets");
console.log("signals webhook validation ok");
