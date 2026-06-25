import { NextResponse } from "next/server";

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...(init?.headers ?? {}), "Cache-Control": "no-store" } });
}

type LimitedParseResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function readTextLimited(req: Request, maxBytes: number): Promise<LimitedParseResult<string>> {
  const len = req.headers.get("content-length");
  if (len && Number(len) > maxBytes) return { ok: false, status: 413, error: "Payload too large" };
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413, error: "Payload too large" };
  return { ok: true, data: text };
}

function parsePlainKeyValue(text: string): LimitedParseResult<Record<string, string>> {
  const data: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) return { ok: false, status: 400, error: `Invalid text/plain format on line ${i + 1}: expected key=value` };
    const key = line.slice(0, eq).trim();
    if (!key) return { ok: false, status: 400, error: `Invalid text/plain format on line ${i + 1}: missing key` };
    data[key] = line.slice(eq + 1).trim();
  }
  return { ok: true, data };
}

export async function readJsonLimited<T = unknown>(req: Request, maxBytes: number): Promise<LimitedParseResult<T>> {
  const text = await readTextLimited(req, maxBytes);
  if (!text.ok) return text;
  try { return { ok: true, data: JSON.parse(text.data || "{}") as T }; } catch { return { ok: false, status: 400, error: "Invalid JSON" }; }
}

export async function readBodyByContentTypeLimited<T = unknown>(req: Request, maxBytes: number): Promise<LimitedParseResult<T | Record<string, string>>> {
  const contentType = (req.headers.get("content-type") ?? "application/json").split(";")[0].trim().toLowerCase();
  if (contentType === "application/json") return readJsonLimited<T>(req, maxBytes);

  const text = await readTextLimited(req, maxBytes);
  if (!text.ok) return text;

  if (contentType === "application/x-www-form-urlencoded") {
    return { ok: true, data: Object.fromEntries(new URLSearchParams(text.data).entries()) };
  }
  if (contentType === "text/plain") return parsePlainKeyValue(text.data);
  return { ok: false, status: 415, error: `Unsupported content type: ${contentType || "missing"}` };
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
