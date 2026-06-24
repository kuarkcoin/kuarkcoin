export const AI_SCORE_MIN = -10;
export const AI_SCORE_MAX = 10;
export function clampAiScore(n: unknown) { const v = Number(n); if (!Number.isFinite(v)) return 0; return Math.max(AI_SCORE_MIN, Math.min(AI_SCORE_MAX, v)); }
export function safeImpact(v: unknown) { const s = String(v ?? "LOW").toUpperCase(); return s === "HIGH" || s === "MEDIUM" || s === "LOW" ? s : "LOW"; }
export function extractJsonObject(text: string) { const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim(); const m = cleaned.match(/\{[\s\S]*\}/); return m?.[0] ?? (cleaned.startsWith("{") ? cleaned : "{}"); }
export function cleanAiText(v: unknown, max = 500) { return String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/[{}[\]`]/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max); }
