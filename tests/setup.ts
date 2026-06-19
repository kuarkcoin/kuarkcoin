import { vi } from "vitest";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role";
process.env.SCAN_SECRET = process.env.SCAN_SECRET || "scan-secret";
process.env.ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || "admin-token";
process.env.CRON_SECRET = process.env.CRON_SECRET || "cron-secret";
process.env.FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "dummy-finnhub";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "dummy-gemini";
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-test";
process.env.APP_URL = process.env.APP_URL || "http://localhost:3000";
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

vi.mock("@/lib/supabaseServer", () => {
  const single = vi.fn(async () => ({ data: { id: 1, symbol: "AAPL", signal: "BUY" }, error: null }));
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const insert = vi.fn(() => ({ select }));
  const limit = vi.fn(async () => ({ data: [], error: null }));
  const order = vi.fn(() => ({ order, limit }));
  const not = vi.fn(() => ({ eq, order }));
  const lt = vi.fn(() => ({ not }));
  const gte = vi.fn(() => ({ lt }));
  const from = vi.fn(() => ({ select: vi.fn(() => ({ gte, order })), insert, update }));
  return { supabaseServer: vi.fn(() => ({ from })) };
});

vi.mock("@/lib/topMarginsCompute", () => ({
  computeTopMargins: vi.fn(async ({ universe }: { universe: string }) => ({
    universe,
    updatedAt: "2026-06-19T00:00:00.000Z",
    periodHint: "TTM",
    topNet: [],
    topGross: [],
    topQuality: [],
  })),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => "OK"),
  },
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(async () => ({
        response: { text: () => "1) Test\n2) Test\n3) Test\n4) Test\n5) Test" },
      })),
    })),
  })),
}));
