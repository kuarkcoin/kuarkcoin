export function normalizeSignalIndicators(input: unknown): string[] {
  if (input == null || input === "") return [];

  let value = input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return String(record.label ?? record.name ?? record.reason ?? "").trim();
        }
        return "";
      })
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [String(record.label ?? record.name ?? record.reason ?? "").trim()].filter(Boolean);
  }

  return [];
}
