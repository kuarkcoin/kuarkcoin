import { describe, expect, it } from "vitest";
import { POST as topCommentary } from "@/app/api/ai/top-commentary/route";
import { POST as analyzeNews } from "@/app/api/ai/analyze-news/route";

function post(url: string, body: unknown) {
  return new Request(url, { method: "POST", body: JSON.stringify(body) });
}

describe("AI validation", () => {
  it("handles empty body within safe limits", async () => {
    const res = await topCommentary(post("http://localhost/api/ai/top-commentary", {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("enforces analyze-news symbol validation", async () => {
    const res = await analyzeNews(post("http://localhost/api/ai/analyze-news", { newsItems: [{ headline: "x" }] }));
    expect(res.status).toBe(400);
  });

  it("handles news body limits without external Gemini calls", async () => {
    const newsItems = Array.from({ length: 50 }, (_, i) => ({ headline: `Headline ${i}` }));
    const res = await analyzeNews(post("http://localhost/api/ai/analyze-news", { symbol: "AAPL", newsItems }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});
