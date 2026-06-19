import { describe, expect, it } from "vitest";
import { PATCH, POST } from "@/app/api/signals/route";

function req(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/signals", { method: "POST", headers, body: JSON.stringify(body) });
}

describe("signals validation", () => {
  it("rejects invalid body", async () => {
    const res = await POST(req({ secret: process.env.SCAN_SECRET, symbol: "BAD SYMBOL", signal: "BUY" }));
    expect(res.status).toBe(400);
  });

  it("validates symbol and accepts a valid payload", async () => {
    const res = await POST(req({ secret: process.env.SCAN_SECRET, symbol: "BIST:AKBNK", signal: "buy", price: 10, score: 20 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("rejects unauthorized PATCH", async () => {
    const res = await PATCH(req({ id: 1, outcome: "WIN" }));
    expect(res.status).toBe(401);
  });
});
