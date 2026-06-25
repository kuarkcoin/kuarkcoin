import { NextResponse } from "next/server.js";

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...(init?.headers ?? {}), "Cache-Control": "no-store" } });
}

export async function readJsonLimited<T = unknown>(req: Request, maxBytes: number): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const len = req.headers.get("content-length");
  if (len && Number(len) > maxBytes) return { ok: false, status: 413, error: "Payload too large" };
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413, error: "Payload too large" };
  try { return { ok: true, data: JSON.parse(text || "{}") as T }; } catch { return { ok: false, status: 400, error: "Invalid JSON" }; }
}

export function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

export function firstForwardedIp(req: Request) {
  const raw = req.headers.get("x-forwarded-for") ?? "";
  const first = raw.split(",")[0]?.trim();
  return first || "unknown";
}
