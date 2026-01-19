// src/lib/reasonTranslator.ts
import { REASON_META } from "./reasonMap";

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

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

// BUY/SELL sinyali + score'a göre kısa etiket
export function scoreBadge(signal: string | null | undefined, score: number | null | undefined) {
  const s = (signal ?? "").toUpperCase();
  const sc = typeof score === "number" ? score : null;

  // skor yoksa boş
  if (sc == null) return "";

  // senin mevcut sistemin: 25 çok güçlü, 18-24 orta, <18 zayıf
  const level =
    sc >= 25 ? "ÇOK GÜÇLÜ" :
    sc >= 18 ? "ORTA" :
    "ZAYIF / TEYİT";

  if (s === "BUY") return `BUY • ${level}`;
  if (s === "SELL") return `SELL • ${level}`;
  return `${level}`;
}

export function reasonsToTechSentences(details: string | null | undefined) {
  const keys = parseReasonKeys(details);

  const sentences = keys
    .map((k) => REASON_META[k]?.sentence)
    .filter(Boolean) as string[];

  const list = uniq(sentences);

  if (!list.length) return "";

  // 4 cümle sınırı (UI taşmasın)
  return list.slice(0, 4).join(" ").replace(/\s{2,}/g, " ").trim();
}