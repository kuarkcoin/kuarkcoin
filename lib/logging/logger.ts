type LogLevel = "info" | "warn" | "error";

export type LogFields = {
  requestId?: string;
  route?: string;
  symbol?: string;
  signal?: string;
  userId?: string;
  status?: number | string;
  duplicate?: boolean;
  providerEventId?: string;
  errorCode?: string;
  durationMs?: number;
};

type LogInput = LogFields & {
  message?: string;
  error?: unknown;
  [key: string]: unknown;
};

const ALLOWED_FIELDS = new Set([
  "requestId",
  "route",
  "symbol",
  "signal",
  "userId",
  "status",
  "duplicate",
  "providerEventId",
  "errorCode",
  "durationMs",
  "message",
  "error",
]);

const SECRET_FIELD_PATTERN = /authorization|cookie|secret|password|service.?role|stripe.*secret|request.?body|body/i;

function safeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) return { name: error.name, message: error.message };
  return String(error);
}

function sanitize(input: LogInput) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_FIELDS.has(key) || SECRET_FIELD_PATTERN.test(key)) continue;
    if (value == null) continue;
    output[key] = key === "error" ? safeError(value) : value;
  }

  return output;
}

function write(level: LogLevel, input: LogInput) {
  const payload = sanitize(input);
  const line = JSON.stringify({ level, ts: new Date().toISOString(), ...payload });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (input: LogInput) => write("info", input),
  warn: (input: LogInput) => write("warn", input),
  error: (input: LogInput) => write("error", input),
};

export function requestId(req: Request) {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}
