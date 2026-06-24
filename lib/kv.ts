const memory = new Map<string, { value: unknown; expiresAt?: number }>();

async function redis(command: unknown[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify([command]), cache: "no-store" });
  if (!res.ok) throw new Error("Redis request failed");
  const data = await res.json();
  return data?.[0]?.result ?? null;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const remote = await redis(["GET", key]);
  if (remote != null) return JSON.parse(remote) as T;
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt && hit.expiresAt < Date.now()) { memory.delete(key); return null; }
  return hit.value as T;
}

export async function kvSet(key: string, value: unknown, ttlSeconds?: number) {
  const encoded = JSON.stringify(value);
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    await redis(ttlSeconds ? ["SET", key, encoded, "EX", ttlSeconds] : ["SET", key, encoded]);
    return;
  }
  memory.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
}
