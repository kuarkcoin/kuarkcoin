import { timingSafeEqual } from "node:crypto";

export function safeCompareSecret(provided: string | null, expected: string | undefined): boolean {
  const providedBuffer = Buffer.from(provided ?? "", "utf8");
  const expectedBuffer = Buffer.from(expected ?? "", "utf8");

  const maxLength = Math.max(providedBuffer.length, expectedBuffer.length, 1);
  const paddedProvided = Buffer.alloc(maxLength);
  const paddedExpected = Buffer.alloc(maxLength);

  providedBuffer.copy(paddedProvided, 0, 0, Math.min(providedBuffer.length, maxLength));
  expectedBuffer.copy(paddedExpected, 0, 0, Math.min(expectedBuffer.length, maxLength));

  const secretsMatch = timingSafeEqual(paddedProvided, paddedExpected);
  return Boolean(expected) && provided !== null && providedBuffer.length === expectedBuffer.length && secretsMatch;
}
