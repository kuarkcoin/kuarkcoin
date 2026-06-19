import { NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
};

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (/(secret|token|key|password|authorization|auth|credential)/i.test(key)) {
        return [key, "[REDACTED]"];
      }
      return [key, redactSecrets(entry)];
    })
  );
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

export function jsonNoStore(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

export function serverError(publicCode: string, logContext: unknown, error: unknown) {
  console.error("server route error", {
    publicCode,
    context: redactSecrets(logContext),
    error: redactSecrets(errorDetails(error)),
  });

  return jsonNoStore({ ok: false, error: publicCode }, { status: 500 });
}
