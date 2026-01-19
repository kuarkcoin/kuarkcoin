// src/lib/reasonTranslator.ts
import { REASON_TO_TECH } from "./reasonMap";

export function parseReasonKeys(details: string | null | undefined) {
  const raw = (details ?? "").trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((token) => token.split("(")[0]?.trim()) // MACD_OK(+10) -> MACD_OK
    .filter(Boolean);
}

export function reasonsToTechSentences(details: string | null | undefined) {
  const keys = parseReasonKeys(details);

  // map’te olmayanları ele
  const sentences = keys.map((k) => REASON_TO_TECH[k]).filter(Boolean);

  // tekrarları temizle
  const uniq = Array.from(new Set(sentences));

  // 0 ise boş dön
  if (!uniq.length) return "";

  // en fazla 4 cümle (UI taşmasın)
  return uniq.slice(0, 4).join(" ") // noktalı zaten cümle sonlarında var
    .replace(/\s{2,}/g, " ")
    .trim();
}