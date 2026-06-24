import { NextResponse } from "next/server";
import { firstForwardedIp } from "@/lib/http";
import { kvGet, kvSet } from "@/lib/kv";

const mem = new Map<string, { count: number; reset: number }>();
export { AI_SCORE_MAX, AI_SCORE_MIN, clampAiScore, cleanAiText, extractJsonObject, safeImpact } from "@/lib/ai-utils";

export async function requireAiConfigAndRateLimit(req: Request, bucket: string, limit = 30, windowSec = 60) {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) return NextResponse.json({ ok: false, error: "AI is not configured" }, { status: 503 });
  const ip = firstForwardedIp(req);
  const key = `rl:${bucket}:${ip}`;
  const now = Date.now();
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!hasRedis && process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Rate limit is not configured" }, { status: 503 });
  const cur = hasRedis ? ((await kvGet<{ count: number; reset: number }>(key)) ?? { count: 0, reset: now + windowSec * 1000 }) : (mem.get(key) ?? { count: 0, reset: now + windowSec * 1000 });
  const next = cur.reset < now ? { count: 1, reset: now + windowSec * 1000 } : { count: cur.count + 1, reset: cur.reset };
  if (next.count > limit) {
    const retry = Math.max(1, Math.ceil((next.reset - now) / 1000));
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(retry) } });
  }
  // Development fallback only; serverless memory is not a reliable production limiter.
  if (hasRedis) await kvSet(key, next, Math.ceil((next.reset - now) / 1000)); else mem.set(key, next);
  return null;
}

