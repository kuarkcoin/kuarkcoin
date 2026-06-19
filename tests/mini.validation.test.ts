import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/news/route";

describe("mini endpoint parameters", () => {
  it("returns empty items for missing symbol", async () => {
    const res = await GET(new Request("http://localhost/api/news?max=500"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, items: [] });
  });

  it("clamps max and uses mocked fetch for valid symbol", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ headline: "AAPL news", url: "https://example.com", datetime: 1 }]))));
    const res = await GET(new Request("http://localhost/api/news?symbol=AAPL&max=999"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
