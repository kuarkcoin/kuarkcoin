// src/lib/reasonMap.ts

export type ReasonTone = "BUY" | "SELL" | "NEUTRAL";

export type ReasonMeta = {
  tone: ReasonTone;
  label: string;
  priority: number; // 1 düşük, 5 kritik
  template: (val?: string) => string;
  chip?: {
    icon?: string;
  };
};

// "+10" / "10" / "+10.5" / "(+10)" gibi değerleri güvenle "(...)" yap
const fmt = (val?: string) => {
  const v0 = (val ?? "").trim();
  if (!v0) return "";
  const v = v0.replace(/^\(/, "").replace(/\)$/, "").trim();
  if (!v) return "";
  return ` (${v})`;
};

export const REASON_META: Record<string, ReasonMeta> = {
  // =========================
  // BUY
  // =========================
  BLUE_REV: {
    tone: "BUY",
    label: "Dip Dönüş",
    priority: 5,
    chip: { icon: "★" },
    template: () =>
      "Sert düşüş sonrası dip dönüş yapısı; tepki potansiyeli yükselir.",
  },
  RSI_BULLDIV3: {
    tone: "BUY",
    label: "RSI Uyumsuzluk",
    priority: 4,
    chip: { icon: "🟤" },
    template: () =>
      "3 pivotlu RSI pozitif uyumsuzluk; satış baskısı zayıflıyor.",
  },

  HID_BULLDIV3: {
    tone: "BUY",
    label: "Hidden Bull Div",
    priority: 4,
    chip: { icon: "🟠" },
    template: () =>
      "Hidden bullish divergence; trend devamı ve tepki ihtimalini destekler.",
  },
  MULTIDIV: {
    tone: "NEUTRAL",
    label: "MultiDiv",
    priority: 4,
    chip: { icon: "🧬" },
    template: () =>
      "RSI/MACD çoklu uyumsuzluk; yön sinyal tipine göre teyit edilmelidir.",
  },
  RSI30_OK: {
    tone: "BUY",
    label: "Momentum Dönüşü",
    priority: 3,
    chip: { icon: "↗" },
    template: (val) =>
      `RSI 30 üzeri dönüş${fmt(val)} momentum toparlanması sinyali verebilir.`,
  },
  MACD_OK: {
    tone: "BUY",
    label: "MACD Kesişimi",
    priority: 3,
    chip: { icon: "↗" },
    template: (val) =>
      `MACD bull cross${fmt(val)} yukarı yönlü momentum ihtimalini artırır.`,
  },
  "MA5/20_OK": {
    tone: "BUY",
    label: "Kısa Trend",
    priority: 2,
    chip: { icon: "↗" },
    template: (val) =>
      `MA5/MA20 yukarı kesişimi${fmt(val)} kısa vadeli trend başlangıcı olabilir.`,
  },
  VWAP_UP: {
    tone: "BUY",
    label: "VWAP Üstü",
    priority: 2,
    chip: { icon: "✓" },
    template: (val) =>
      `VWAP üzerinde tutunma${fmt(val)} alıcı kontrolünü destekler.`,
  },
  VOL_UP: {
    tone: "BUY",
    label: "Hacim Artışı",
    priority: 2,
    chip: { icon: "📈" },
    template: (val) =>
      `Hacim artışı${fmt(val)} hareketin katılımla desteklendiğini gösterir.`,
  },
  GC_OK: {
    tone: "BUY",
    label: "Golden Cross",
    priority: 5,
    chip: { icon: "🏆" },
    template: (val) =>
      `Golden Cross${fmt(val)} uzun vadeli rejim değişimi sinyali verebilir.`,
  },
  D1_CONFIRM: {
    tone: "BUY",
    label: "MTF Onay",
    priority: 4,
    chip: { icon: "D" },
    template: (val) =>
      `Günlük zaman dilimi onayı${fmt(val)} büyük resimde trendi destekler.`,
  },


  FLAG_BRK: {
    tone: "BUY",
    label: "Flama Kırılımı",
    priority: 3,
    chip: { icon: "🏁" },
    template: () =>
      "Flama kırılımı; sıkışma sonrası yukarı hareket potansiyelini artırır.",
  },
  NEAR_SUP: {
    tone: "NEUTRAL",
    label: "Desteğe Yakın",
    priority: 2,
    chip: { icon: "🧱" },
    template: () =>
      "Fiyat desteğe yakın; yön ana sinyal ve destek tepkisiyle değerlendirilmelidir.",
  },
  COMBO_SPRING_DIV: {
    tone: "BUY",
    label: "Spring Divergence",
    priority: 5,
    chip: { icon: "🌱" },
    template: () =>
      "Spring divergence kombinasyonu; destek süpürmesi sonrası dönüş ihtimalini güçlendirir.",
  },
  COMBO_DB_BREAKOUT: {
    tone: "BUY",
    label: "İkili Dip Kırılımı",
    priority: 5,
    chip: { icon: "Ⓦ" },
    template: () =>
      "İkili dip kırılımı; taban oluşumu sonrası yukarı devam ihtimalini destekler.",
  },

  // =========================
  // SELL
  // =========================
  TOP_REV: {
    tone: "SELL",
    label: "Tepe Dönüş",
    priority: 5,
    chip: { icon: "★" },
    template: () =>
      "Tepe dönüş yapısı; kâr satışı ve geri çekilme riski artıyor.",
  },
  RSI_BEARDIV3: {
    tone: "SELL",
    label: "RSI Negatif Uyumsuzluk",
    priority: 4,
    chip: { icon: "🔵" },
    template: () =>
      "RSI negatif uyumsuzluk; momentum kaybı ve tepe riski.",
  },

  HID_BEARDIV3: {
    tone: "SELL",
    label: "Hidden Bear Div",
    priority: 4,
    chip: { icon: "🔵" },
    template: () =>
      "Hidden bearish divergence; zayıf trend devamı ve satış riskini artırır.",
  },
  RSI70_DN: {
    tone: "SELL",
    label: "Momentum Zayıf",
    priority: 3,
    chip: { icon: "↘" },
    template: (val) =>
      `RSI 70 altına sarkma${fmt(val)} aşırı alımdan çıkış sinyali.`,
  },
  VWAP_DN: {
    tone: "SELL",
    label: "VWAP Altı",
    priority: 2,
    chip: { icon: "!" },
    template: (val) =>
      `VWAP altı fiyatlama${fmt(val)} satıcılı rejim uyarısıdır.`,
  },
  "MA5/20_DN": {
    tone: "SELL",
    label: "Trend Kırılımı",
    priority: 3,
    chip: { icon: "↘" },
    template: (val) =>
      `MA5/MA20 aşağı kesişimi${fmt(val)} zayıflama riskini artırır.`,
  },
  BEAR_CANDLE: {
    tone: "SELL",
    label: "Ayı Mum",
    priority: 2,
    chip: { icon: "🕯" },
    template: () =>
      "Ayı mum formasyonu; satış baskısı artabilir.",
  },

  NEAR_RES: {
    tone: "NEUTRAL",
    label: "Dirence Yakın",
    priority: 2,
    chip: { icon: "🧱" },
    template: () =>
      "Fiyat dirence yakın; yön ana sinyal ve direnç tepkisiyle değerlendirilmelidir.",
  },
  COMBO_CAPITULATION: {
    tone: "NEUTRAL",
    label: "Kapitülasyon Dönüşü",
    priority: 5,
    chip: { icon: "⚡" },
    template: () =>
      "Kapitülasyon dönüşü; panik satış sonrası tepki ihtimali ana sinyalle teyit edilmelidir.",
  },
  VOL_DUMP: {
    tone: "SELL",
    label: "Hacimli Satış",
    priority: 4,
    chip: { icon: "📉" },
    template: (val) =>
      `Hacimli düşüş${fmt(val)} dağıtım riskini yükseltir.`,
  },
};

// =========================
// HELPER EXPORTLAR
// =========================
export function reasonLabel(key: string) {
  return REASON_META[key]?.label ?? key;
}

export function reasonIcon(key: string) {
  return REASON_META[key]?.chip?.icon ?? "";
}

export function reasonTone(key: string, signal?: string | null): ReasonTone {
  const tone = REASON_META[key]?.tone ?? "NEUTRAL";
  if (tone !== "NEUTRAL") return tone;

  const normalizedSignal = String(signal ?? "").toUpperCase();
  if (normalizedSignal === "BUY" || normalizedSignal === "SELL") return normalizedSignal;

  return "NEUTRAL";
}

export function reasonPriority(key: string) {
  return REASON_META[key]?.priority ?? 1;
}