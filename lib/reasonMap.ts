// src/lib/reasonMap.ts

export type ReasonTone = "BUY" | "SELL" | "NEUTRAL";

export type ReasonMeta = {
  tone: ReasonTone;
  label: string;
  priority: number; // 1 düşük, 5 kritik
  template: (val?: string) => string;
  // UI otomasyon (opsiyonel ama çok işe yarar)
  chip?: {
    icon?: string;
  };
};

// "+10" / "10" / "+10.5" / "+10%)" / "(+10)" gibi değerleri güvenle "(...)" yap
const fmt = (val?: string) => {
  const v0 = (val ?? "").trim();
  if (!v0) return "";

  // zaten parantezliyse tekrar parantezleme
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
      "Sert düşüş sonrası dip dönüş (reversal) yapısı oluşmuş; tepki potansiyeli artar.",
  },
  RSI_BULLDIV3: {
    tone: "BUY",
    label: "RSI Uyumsuzluk",
    priority: 4,
    chip: { icon: "🟤" },
    template: () =>
      "3 pivotlu RSI pozitif uyumsuzluk, satış baskısının zayıfladığına ve dipten dönüş ihtimaline işaret eder.",
  },
  RSI30_OK: {
    tone: "BUY",
    label: "Momentum Dönüşü",
    priority: 3,
    chip: { icon: "↗" },
    template: (val) =>
      `RSI 30 üzeri geri dönüş${fmt(val)} aşırı satımdan çıkış ve momentum toparlanması sinyali verebilir.`,
  },
  MACD_OK: {
    tone: "BUY",
    label: "MACD Kesişimi",
    priority: 3,
    chip: { icon: "↗" },
    template: (val) =>
      `MACD bull cross${fmt(val)} momentumun yukarı yönlü döndüğünü ve ivmelenme ihtimalini gösterir.`,
  },
  "MA5/20_OK": {
    tone: "BUY",
    label: "Kısa Trend",
    priority: 2,
    chip: { icon: "↗" },
    template: (val) =>
      `MA5/MA20 yukarı kesişimi${fmt(val)} kısa vadede trend başlangıcı/ivmelenme sinyali üretebilir.`,
  },
  VWAP_UP: {
    tone: "BUY",
    label: "Trend Teyidi",
    priority: 2,
    chip: { icon: "✓" },
    template: (val) =>
      `Fiyatın VWAP üzerinde kalması${fmt(val)} gün içi trend teyidi ve alıcı kontrolü şeklinde okunabilir.`,
  },
  VOL_UP: {
    tone: "BUY",
    label: "Katılım Artışı",
    priority: 2,
    chip: { icon: "📈" },
    template: (val) =>
      `Hacim artışı${fmt(val)} hareketin katılımla desteklendiğini ve sinyal kalitesinin güçlendiğini gösterir.`,
  },
  GC_OK: {
    tone: "BUY",
    label: "Golden Cross",
    priority: 5,
    chip: { icon: "🏆" },
    template: (val) =>
      `Golden Cross (MA50>MA200)${fmt(val)} uzun vadeli rejimde pozitifleşme ihtimalini artırır (tek başına yeterli değildir).`,
  },
  D1_CONFIRM: {
    tone: "BUY",
    label: "MTF Onay",
    priority: 4,
    chip: { icon: "D" },
    template: (val) =>
      `Günlük zaman dilimi onayı${fmt(val)} daha büyük resimde trendin desteklendiğine işaret eder.`,
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
      "Aşırı yükseliş sonrası tepe dönüş (reversal) yapısı, kâr satışı ve geri çekilme riskini artırır.",
  },
  RSI_BEARDIV3: {
    tone: "SELL",
    label: "RSI Uyumsuzluk",
    priority: 4,
    chip: { icon: "🔵" },
    template: () =>
      "3 pivotlu RSI negatif uyumsuzluk, yükselişte momentum kaybı ve tepe oluşumu riskine işaret eder.",
  },
  RSI70_DN: {
    tone: "SELL",
    label: "Momentum Zayıflıyor",
    priority: 3,
    chip: { icon: "↘" },
    template: (val) =>
      `RSI’nin 70 altına sarkması${fmt(val)} aşırı alım sonrası soğuma ve momentum zayıflaması göstergesi olabilir.`,
  },
  VWAP_DN: {
    tone: "SELL",
    label: "Trend Zayıf",
    priority: 2,
    chip: { icon: "!" },
    template: (val) =>
      `Fiyatın VWAP altına inmesi${fmt(val)} gün içi trend zayıflaması ve satıcılı rejim uyarısıdır.`,
  },
  "MA5/20_DN": {
    tone: "SELL",
    label: "Kısa Trend Kırılımı",
    priority: 3,
    chip: { icon: "↘" },
    template: (val) =>
      `MA5/MA20 aşağı kesişimi${fmt(val)} kısa vadeli zayıflama ve geri çekilme riskini yükseltir.`,
  },
  BEAR_CANDLE: {
    tone: "SELL",
    label: "Ayı Mum",
    priority: 2,
    chip: { icon: "🕯" },
    template: () =>
      "Ayı mum formasyonları satış baskısını artırabilir; tepe bölgelerinde teyit aramak gerekir.",
  },
  VOL_DUMP: {
    tone: "SELL",
    label: "Satış Baskısı (Hacim)",
    priority: 4,
    chip: { icon: "📉" },
    template: (val) =>
      `Artan işlem hacmi eşliğinde gelen düşüş${fmt(val)} güçlü katılımlı satış baskısına işaret edebilir. Hacim destekli satış, hareketin tesadüfi değil “dağıtım (distribution)” karakterli olma riskini artırır.`,
  },
};