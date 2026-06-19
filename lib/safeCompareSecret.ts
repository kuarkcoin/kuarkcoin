import { timingSafeEqual } from "crypto";

export function safeCompareSecret(value: string, expected: string | undefined): boolean {
  if (!expected || !value) return false;

  const valueBuffer = Buffer.from(value, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (valueBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(valueBuffer, expectedBuffer);
}
