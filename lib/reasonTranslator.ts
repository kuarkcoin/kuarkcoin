// src/lib/reasonTranslator.ts
import { REASON_META, type ReasonMeta, type ReasonTone } from "./reasonMap";

export type ParsedReason = {
  key: string;
  value?: string;
  meta?: ReasonMeta; // meta yoksa fallback kullanırız
};

// "VOL_DUMP(+5)" -> { key:"VOL_DUMP", value:"+5" }
function parseOne(part: string): ParsedReason | null {
  const p = part.trim();
  if (!p) return null;

  // KEY veya KEY(VAL)
  const m = p.match(/^([A-Z0-9_\/]+)(?:\(([^)]*)\))?$/);
  if (!m) return null;

  const key = m[1]?.trim();
  const value = (m[2] ?? "").trim() || undefined;
  if (!key) return null;

  const meta = REASON_META[key]; // meta yoksa da döndür (fallback için)
  return { key, value, meta };
}

export function parseReasonDetails(details: string | null | undefined): ParsedReason[] {
  const raw = (details ?? "").trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map(parseOne)
    .filter((x): x is ParsedReason => x !== null);
}

// --- Fallback cümle (map’te yoksa bile bir şey yazsın) ---
function fallbackSentence(key: string, value?: string) {
  // çok kaba ama hiç yoktan iyidir
  const v = (value ?? "").trim();
  return v ? `${key} sinyali (${v}) oluştu.` : `${key} sinyali oluştu.`;
}

// --- Öncelik getir (meta yoksa 0) ---
function prio(r: ParsedReason) {
  return r.meta?.priority ?? 0;
}

// --- Tone filtre (meta yoksa geçirme) ---
function toneOk(r: ParsedReason, tone?: ReasonTone) {
  if (!tone) return true; // filtre yok
  if (!r.meta) return false; // meta yoksa tone bilinmez
  return r.meta.tone === tone || r.meta.tone === "NEUTRAL";
}

/**
 * Teknik cümle üretir.
 * - tone ver: "BUY" / "SELL" (Top BUY kartında BUY, Top SELL kartında SELL)
 * - limit default 4
 * - forceKeys: bazı sinyalleri mutlaka dahil et (örn: SELL için VOL_DUMP)
 */
export function reasonsToTechSentences(
  details: string | null | undefined,
  opts?: {
    tone?: ReasonTone;
    limit?: number;
    forceKeys?: string[];
  }
) {
  const limit = opts?.limit ?? 4;
  const forceKeys = new Set(opts?.forceKeys ?? []);

  const parsed0 = parseReasonDetails(details);

  // 1) tone filtresi
  const parsed = parsed0.filter((r) => toneOk(r, opts?.tone));

  // 2) priority sort
  parsed.sort((a, b) => prio(b) - prio(a));

  // 3) tekilleştir (key bazlı)
  const sentenceByKey = new Map<string, string>();
  for (const r of parsed) {
    if (sentenceByKey.has(r.key)) continue;

    const sentence = r.meta
      ? r.meta.template(r.value)
      : fallbackSentence(r.key, r.value);

    if (sentence?.trim()) sentenceByKey.set(r.key, sentence.trim());
  }

  // 4) “forceKeys” önce (örn VOL_DUMP mutlaka girsin)
  const forced: string[] = [];
  for (const k of forceKeys) {
    if (sentenceByKey.has(k)) forced.push(k);
  }

  // 5) kalanları sırayla ekle
  const rest = Array.from(sentenceByKey.keys()).filter((k) => !forced.includes(k));

  const finalKeys = [...forced, ...rest].slice(0, limit);

  const out = finalKeys.map((k) => sentenceByKey.get(k)!).join(" ");

  return out;
}

/**
 * UI’da chip/badge yapmak istersen:
 * label + icon + tone + priority döndürür.
 */
export function reasonsToChips(details: string | null | undefined, tone?: ReasonTone) {
  const parsed0 = parseReasonDetails(details);
  const parsed = parsed0.filter((r) => toneOk(r, tone)).sort((a, b) => prio(b) - prio(a));

  const uniq = new Map<string, { key: string; label: string; icon?: string; tone?: ReasonTone; priority: number }>();

  for (const r of parsed) {
    if (uniq.has(r.key)) continue;

    const label = r.meta?.label ?? r.key;
    const icon = r.meta?.chip?.icon;
    const t = r.meta?.tone;
    const priority = r.meta?.priority ?? 0;

    uniq.set(r.key, { key: r.key, label, icon, tone: t, priority });
  }

  return Array.from(uniq.values());
}