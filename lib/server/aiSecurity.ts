import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const AI_BODY_LIMIT_BYTES = 128 * 1024;
export const MAX_NEWS_ITEMS = 20;
export const MAX_TOP_BUY = 10;
export const MAX_TOP_SELL = 10;
export const MAX_HEADLINE_CHARS = 200;
export const MAX_TEXT_CHARS = 1000;
export const MAX_EXPLANATION_CHARS = 200;

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 30;

type Impact = "HIGH" | "MEDIUM" | "LOW";

type RedisLike = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

let redisPromise: Promise<RedisLike | null> | null = null;

function fixedLengthToken(input: string) {
  return crypto.createHash("sha256").update(input).digest();
}

function timingSafeEqualString(a: string, b: string) {
  return crypto.timingSafeEqual(fixedLengthToken(a), fixedLengthToken(b));
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.headers.get("x-real-ip") || "unknown";
}

function rateLimitKey(req: Request) {
  const url = new URL(req.url);
  const ipHash = crypto.createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 24);
  return `ai-rate:${url.pathname}:${ipHash}`;
}

async function getRedis(): Promise<RedisLike | null> {
  if (redisPromise) return redisPromise;

  redisPromise = (async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;

    const packageName = "@upstash/redis";
    const mod = (await import(packageName)) as { Redis?: { new (opts: { url: string; token: string }): RedisLike } };
    if (!mod.Redis) throw new Error("@upstash/redis Redis export not found");
    return new mod.Redis({ url, token });
  })();

  return redisPromise;
}

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

export async function requireAdminBearer(req: Request) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return jsonNoStore({ ok: false, error: "Admin token is not configured." }, { status: 403 });
  }

  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const provided = match?.[1]?.trim() || "";

  if (!provided) {
    return jsonNoStore({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!timingSafeEqualString(provided, expected)) {
    return jsonNoStore({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const redis = await getRedis();
  if (redis) {
    const key = rateLimitKey(req);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    if (count > RATE_LIMIT_MAX_REQUESTS) {
      return jsonNoStore({ ok: false, error: "Rate limit exceeded." }, { status: 429 });
    }
  }

  return null;
}

export async function readLimitedJson(req: Request, maxBytes = AI_BODY_LIMIT_BYTES) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    throw Object.assign(new Error("Request body too large."), { status: 413 });
  }

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw Object.assign(new Error("Request body too large."), { status: 413 });
  }

  if (!text.trim()) return {};
  return JSON.parse(text);
}

export function limitText(input: unknown, maxChars: number) {
  return String(input ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxChars);
}

export function sanitizeNewsItems(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_NEWS_ITEMS).map((item) => ({
    ...item,
    headline: limitText((item as any)?.headline ?? (item as any)?.title, MAX_HEADLINE_CHARS),
    title: limitText((item as any)?.title ?? (item as any)?.headline, MAX_HEADLINE_CHARS),
    text: limitText((item as any)?.text, MAX_TEXT_CHARS),
    summary: limitText((item as any)?.summary, MAX_TEXT_CHARS),
  }));
}

export function sanitizeTopRows<T extends Record<string, unknown>>(input: unknown, maxItems: number): T[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, maxItems).map((row) => ({
    ...(row as T),
    symbol: limitText((row as any)?.symbol, 40),
    signal: limitText((row as any)?.signal, 40),
    reasons: limitText((row as any)?.reasons, MAX_TEXT_CHARS),
  }));
}

export function validateGeminiNewsAnalysis(input: unknown) {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rawScore = Number(data.score ?? 0);
  const impact = String(data.impact ?? "LOW").toUpperCase();

  return {
    score: Math.max(-10, Math.min(10, Number.isFinite(rawScore) ? rawScore : 0)),
    impact: (impact === "HIGH" || impact === "MEDIUM" || impact === "LOW" ? impact : "LOW") as Impact,
    explanation: limitText(data.explanation || "Özet yok.", MAX_EXPLANATION_CHARS) || "Özet yok.",
  };
}
