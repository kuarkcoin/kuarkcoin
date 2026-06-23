export type NormalizedIndicator = {
  name: string;
  detail?: string | null;
  category?: string | null;
};

const REASON_KEY_MAP: Record<string, string> = {
  BLUE_REV: "BLUE_STAR",
  RSI_BULLDIV3: "RSI_DIV",
  RSI_BEARDIV3: "RSI_DIV",
  HID_BULLDIV3: "HID_DIV",
  HID_BEARDIV3: "HID_DIV",
  MULTIDIV: "MULTIDIV",
  FLAG_BRK: "BULL_FLAG",
  RSI30_OK: "RSI_30",
  RSI70_DN: "RSI_70_DOWN",
  MACD_OK: "MACD_BULL",
  "MA5/20_OK": "MA5_20_UP",
  "MA5/20_DN": "MA5_20_DOWN",
  VWAP_UP: "VWAP_UP",
  VWAP_DN: "VWAP_DOWN",
  VOL_UP: "VOL_BOOST",
  VOL_DUMP: "SELL_PRESSURE",
  GC_OK: "GOLDEN_CROSS",
  D1_CONFIRM: "D1_CONFIRM",
  FLAG_BREAKOUT: "BULL_FLAG",
  BULL_FLAG: "BULL_FLAG",
  NEAR_SUP: "NEAR_SUP",
  NEAR_RES: "NEAR_RES",
  BEAR_CANDLE: "SELL_CANDLE",
  COMBO_CAPITULATION: "COMBO_CAPITULATION",
  COMBO_SPRING_DIV: "COMBO_SPRING_DIV",
  COMBO_DB_BREAKOUT: "COMBO_DB_BREAKOUT",
  TOP_REV: "RED_STAR",
};

const DETAIL_PATTERNS: Array<[RegExp, string, string]> = [
  [/\bbullish\s+divergence\b/i, "Boğa uyumsuzluğu", "bullish"],
  [/\bbearish\s+divergence\b/i, "Ayı uyumsuzluğu", "bearish"],
  [/\bbullish\s+crossover\b|\bbull\s+cross\b/i, "Boğa kesişimi", "bullish"],
  [/\bbearish\s+crossover\b|\bbear\s+cross\b/i, "Ayı kesişimi", "bearish"],
  [/\boversold\b/i, "Aşırı satım bölgesi", "bullish"],
  [/\boverbought\b/i, "Aşırı alım bölgesi", "bearish"],
  [/\bbreakout\b/i, "Kırılım", "bullish"],
  [/\bvolume\s+spike\b/i, "Hacim sıçraması", "volume"],
];

const INDICATOR_PATTERNS: Array<[RegExp, string]> = [
  [/\bRSI\b/i, "RSI"],
  [/\bMACD\b/i, "MACD"],
  [/\bVWAP\b/i, "VWAP"],
  [/\bMA\s*5\s*[/>-]?\s*20\b|\bMA5\s*[/>-]?\s*MA?20\b/i, "MA5/20"],
  [/\bGOLDEN[_\s-]?CROSS\b|\bGC_OK\b/i, "Golden Cross"],
  [/\bVOLUME\b|\bVOL(?:_UP|_DUMP|_BOOST)?\b/i, "Volume"],
  [/\bDIVERGENCE\b|\bDIV\b/i, "Divergence"],
  [/\bBREAKOUT\b|\bFLAG(?:_BRK|_BREAKOUT)?\b/i, "Breakout"],
];

export function normalizeReasonKey(raw: string) {
  const k = raw.split("(")[0].trim();
  return REASON_KEY_MAP[k] ?? k;
}

function tryJson(value: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed || !/^[\[{\"]/.test(trimmed)) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function detailFor(value: string) {
  return DETAIL_PATTERNS.find(([pattern]) => pattern.test(value));
}

function indicatorNameFor(value: string) {
  return INDICATOR_PATTERNS.find(([pattern]) => pattern.test(value))?.[1];
}

function fromStringPart(part: string): NormalizedIndicator | null {
  const cleaned = part.trim();
  if (!cleaned) return null;

  const normalizedKey = normalizeReasonKey(cleaned);
  const detailMatch = detailFor(cleaned);
  const explicitIndicator = indicatorNameFor(cleaned) ?? (/^[A-Z0-9_\/.-]+(?:\([^)]*\))?$/.test(cleaned) ? normalizedKey : null);

  if (!explicitIndicator) return null;

  return {
    name: explicitIndicator,
    detail: detailMatch?.[1] ?? null,
    category: detailMatch?.[2] ?? null,
  };
}

function fromObject(value: Record<string, unknown>): NormalizedIndicator | null {
  const rawName = value.name ?? value.indicator ?? value.key ?? value.reason ?? value.code ?? value.label;
  if (typeof rawName !== "string" || !rawName.trim()) return null;
  const fallback = fromStringPart(rawName);
  const detail = typeof value.detail === "string" ? value.detail : typeof value.description === "string" ? value.description : fallback?.detail;
  const category = typeof value.category === "string" ? value.category : typeof value.type === "string" ? value.type : fallback?.category;
  return { name: fallback?.name ?? normalizeReasonKey(rawName), detail: detail ?? null, category: category ?? null };
}

export function normalizeSignalIndicators(input: unknown): NormalizedIndicator[] {
  if (input == null) return [];
  const parsed = typeof input === "string" ? tryJson(input) : undefined;
  const value = parsed ?? input;

  const items: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;|\n]+/g)
      : typeof value === "object"
        ? [value]
        : [];

  const seen = new Set<string>();
  const out: NormalizedIndicator[] = [];
  for (const item of items) {
    const normalized = typeof item === "string" ? fromStringPart(item) : item && typeof item === "object" ? fromObject(item as Record<string, unknown>) : null;
    if (!normalized) continue;
    const key = `${normalized.name}|${normalized.detail ?? ""}|${normalized.category ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

export function parseSignalIndicatorKeys(input: unknown): string[] {
  return normalizeSignalIndicators(input).map((item) => item.name);
}
