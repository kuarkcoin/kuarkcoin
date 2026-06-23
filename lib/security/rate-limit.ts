type RateLimitStore = "memory" | "kv";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  store: RateLimitStore;
};

type MemoryEntry = {
  count: number;
  reset: number;
};

const memoryHits = new Map<string, MemoryEntry>();

function nowMs() {
  return Date.now();
}

function normalizeKey(key: string) {
  return key.replace(/[^a-zA-Z0-9:._-]/g, "_").slice(0, 180);
}

function kvConfig() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function kvCommand<T>(command: unknown[]): Promise<T | null> {
  const config = kvConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`KV rate-limit command failed: ${response.status}`);
  const payload = (await response.json()) as { result?: T };
  return payload.result ?? null;
}

async function kvRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult | null> {
  if (!kvConfig()) return null;

  const safeKey = `rl:${normalizeKey(key)}`;
  const count = Number(await kvCommand<number>(["INCR", safeKey]));
  if (count === 1) {
    await kvCommand(["PEXPIRE", safeKey, options.windowMs]);
  }

  const ttl = Math.max(0, Number(await kvCommand<number>(["PTTL", safeKey])));
  const reset = nowMs() + (ttl || options.windowMs);

  return {
    allowed: count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - count),
    reset,
    store: "kv",
  };
}

function memoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const current = nowMs();
  const safeKey = normalizeKey(key);
  const existing = memoryHits.get(safeKey);
  const entry = existing && existing.reset > current ? existing : { count: 0, reset: current + options.windowMs };
  entry.count += 1;
  memoryHits.set(safeKey, entry);

  for (const [entryKey, value] of memoryHits) {
    if (value.reset <= current) memoryHits.delete(entryKey);
  }

  return {
    allowed: entry.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - entry.count),
    reset: entry.reset,
    store: "memory",
  };
}

export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  try {
    const kvResult = await kvRateLimit(options.key, options);
    if (kvResult) return kvResult;
  } catch {
    // Fall back to memory so an unavailable KV provider does not take the app down.
  }

  return memoryRateLimit(options.key, options);
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
    "X-RateLimit-Store": result.store,
  };
}

export function clientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.headers.get("x-real-ip") || "unknown";
}
