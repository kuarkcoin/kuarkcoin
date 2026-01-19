// src/lib/reasonTranslator.ts
import { REASON_META, type ReasonMeta } from "./reasonMap";

export type ParsedReason = {
  key: string;
  value?: string; // "+10" gibi
  meta: ReasonMeta;
};

export function parseReasonDetails(details: string | null | undefined): ParsedReason[] {
  const raw = (details ?? "").trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((part) => {
      const p = part.trim();
      if (!p) return null;

      // KEY(+10) veya KEY(whatever)
      const match = p.match(/^([A-Z0-9_\/]+)(?:(.*))?$/);
      if (!match) return null;

      const key = (match[1] ?? "").trim();
      const value = (match[2] ?? "").trim(); // "+10" yakalanır
      const meta = REASON_META[key];
      if (!meta) return null;

      return { key, value: value || undefined, meta };
    })
    .filter((x): x is ParsedReason => x !== null)
    .sort((a, b) => b.meta.priority - a.meta.priority);
}

export function getTechnicalSummary(details: string | null | undefined, limit = 4): string {
  const parsed = parseReasonDetails(details);

  // aynı key tekrarını kaldır
  const seen = new Set<string>();
  const out: string[] = [];

  for (const p of parsed) {
    if (seen.has(p.key)) continue;
    seen.add(p.key);

    const sentence = p.meta.template(p.value);
    if (sentence) out.push(sentence);

    if (out.length >= limit) break;
  }

  return out.join(" ").replace(/\s{2,}/g, " ").trim();
}

// senin eski fonksiyon adına uyum (UI kırılmasın)
export function reasonsToTechSentences(details: string | null | undefined) {
  return getTechnicalSummary(details, 4);
}

export function scoreBadge(signal: string | null | undefined, score: number | null | undefined) {
  const s = (signal ?? "").toUpperCase();
  const sc = typeof score === "number" ? score : null;
  if (sc == null) return "";

  const level =
    sc >= 25 ? "ÇOK GÜÇLÜ" :
    sc >= 18 ? "ORTA" :
    "ZAYIF / TEYİT";

  if (s === "BUY") return `BUY • ${level}`;
  if (s === "SELL") return `SELL • ${level}`;
  return `${level}`;
}

export function getSignalUI(signal: string | null | undefined, score: number | null | undefined) {
  const s = (signal ?? "").toUpperCase();
  const sc = typeof score === "number" ? score : 0;

  const strength =
    sc >= 25 ? "GÜÇLÜ