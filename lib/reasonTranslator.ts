// src/lib/reasonTranslator.ts
import { REASON_META, type ReasonMeta } from "./reasonMap";

export type ParsedReason = {
  key: string;
  value?: string;
  meta: ReasonMeta;
};

// "VOL_DUMP(+5)" -> { key:"VOL_DUMP", value:"+5" }
function parseOne(part: string): ParsedReason | null {
  const p = part.trim();
  if (!p) return null;

  // KEY veya KEY(VAL) formatını yakala
  const m = p.match(/^([A-Z0-9_\/]+)(?:\(([^)]*)\))?$/);
  if (!m) return null;

  const key = m[1]?.trim();
  const value = (m[2] ?? "").trim() || undefined;

  const meta = REASON_META[key];
  if (!meta) return null;

  return { key, value, meta };
}

export function parseReasonDetails(details: string | null | undefined): ParsedReason[] {
  const raw = (details ?? "").trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map(parseOne)
    .filter((x): x is ParsedReason => x !== null) // ✅ null temizle (TS hatası çözülür)
    .sort((a, b) => b.meta.priority - a.meta.priority); // ✅ öncelik
}

// ✅ Terminal’de gördüğün "teknik yorum" buradan üretilsin
export function reasonsToTechSentences(
  details: string | null | undefined,
  limit = 4
) {
  const parsed = parseReasonDetails(details);

  // Aynı key tekrarını tekle
  const map = new Map<string, string>();
  for (const p of parsed) {
    if (!map.has(p.key)) {
      map.set(p.key, p.meta.template(p.value));
    }
  }

  const sentences = Array.from(map.values()).filter(Boolean);

  return sentences.slice(0, limit).join(" ");
}