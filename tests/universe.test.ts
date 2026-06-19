import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/financials/top-margins/route";
import { kv } from "@vercel/kv";

describe("universe parameter", () => {
  it("normalizes NASDAQ100 universe", async () => {
    vi.mocked(kv.get).mockResolvedValueOnce(null).mockResolvedValueOnce("2026-06-19T00:00:00.000Z");
    const res = await GET(new Request("http://localhost/api/financials/top-margins?universe=nasdaq100"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.universe).toBe("NASDAQ100");
  });
});
