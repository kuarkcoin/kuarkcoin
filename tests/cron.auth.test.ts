import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/top-margins/route";

describe("cron Authorization", () => {
  it("rejects missing token", async () => {
    const res = await GET(new Request("http://localhost/api/cron/top-margins"));
    expect(res.status).toBe(401);
  });

  it("accepts CRON_SECRET token", async () => {
    const res = await GET(new Request(`http://localhost/api/cron/top-margins?token=${process.env.CRON_SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});
