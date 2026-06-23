import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ duplicate: null as any, inserted: null as any }));

vi.mock("@/lib/supabaseServer", () => ({
  supabaseServer: () => ({
    from: () => ({
      select() { return this; },
      eq() { return this; },
      async maybeSingle() { return { data: state.duplicate, error: null }; },
      insert(rows: any[]) { state.inserted = rows[0]; return this; },
      async single() { return { data: { id: 1, ...state.inserted }, error: null }; },
    }),
  }),
}));

async function post(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/signals/route");
  return POST(new Request("http://test/api/signals", { method: "POST", body: JSON.stringify(body) }));
}

describe("signals route", () => {
  beforeEach(() => {
    process.env.SCAN_SECRET = "scan";
    state.duplicate = null;
    state.inserted = null;
    vi.resetModules();
  });

  it("accepts legacy payloads", async () => {
    const res = await post({ secret: "scan", symbol: "aapl", signal: "buy", price: "10" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, data: { symbol: "AAPL", signal: "BUY", price: 10 } });
  });

  it("accepts extended premium payloads", async () => {
    const res = await post({ secret: "scan", ticker: "msft", side: "sell", close: 20, relative_volume: 2, tier: "premium", timeframe: "4h" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, data: { symbol: "MSFT", signal: "SELL", rvol: 2, timeframe: "4h" } });
  });

  it("returns 401 for wrong secret and 503 for missing configured secret", async () => {
    expect((await post({ secret: "wrong", symbol: "AAPL", signal: "BUY", price: 10 })).status).toBe(401);
    delete process.env.SCAN_SECRET;
    expect((await post({ secret: "scan", symbol: "AAPL", signal: "BUY", price: 10 })).status).toBe(503);
  });

  it("returns 400 for invalid price or rvol", async () => {
    expect((await post({ secret: "scan", symbol: "AAPL", signal: "BUY", price: "x" })).status).toBe(400);
    expect((await post({ secret: "scan", symbol: "AAPL", signal: "BUY", price: 10, rvol: "x" })).status).toBe(400);
  });

  it("detects duplicate event_id", async () => {
    state.duplicate = { id: 9, event_id: "evt" };
    const res = await post({ secret: "scan", symbol: "AAPL", signal: "BUY", price: 10, event_id: "evt" });
    expect(await res.json()).toMatchObject({ ok: true, duplicate: true, data: { id: 9 } });
  });

  it("filters Free fields and keeps Premium fields", async () => {
    await post({ secret: "scan", symbol: "AAPL", signal: "BUY", price: 10, rvol: 7, timeframe: "1h" });
    expect(state.inserted).not.toHaveProperty("rvol");
    await post({ secret: "scan", symbol: "AAPL", signal: "BUY", price: 10, rvol: 7, tier: "premium", timeframe: "1h" });
    expect(state.inserted).toMatchObject({ rvol: 7, timeframe: "1h" });
  });
});
