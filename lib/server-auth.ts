import { NextResponse } from "next/server.js";

function bearer(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

export function getBearerToken(req: Request) { return bearer(req); }

export function requireWebhookSecret(req: Request, body?: Record<string, unknown>) {
  const expectedSecret = process.env.SCAN_SECRET;
  if (!expectedSecret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  const providedSecret = bearer(req) || (typeof body?.secret === "string" ? body.secret : "");
  if (!providedSecret || providedSecret !== expectedSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export function requireAdmin(req: Request) {
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected) return NextResponse.json({ error: "Admin API is not configured" }, { status: 503 });
  const provided = bearer(req);
  if (!provided || provided !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export function requireCron(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  if (authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export function requirePremium() {
  return NextResponse.json({ error: "Premium authentication is not configured" }, { status: 503 });
}
