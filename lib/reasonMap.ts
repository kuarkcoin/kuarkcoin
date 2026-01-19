// src/lib/reasonMap.ts

export type ReasonTone = "BUY" | "SELL" | "NEUTRAL";

export type ReasonMeta = {
  tone: ReasonTone;
  label?: string;          // rozet metni istersen
  sentence: string;        // teknik cümle
};

export const REASON_META: Record<string, ReasonMeta> = {
  // =========================
  // BUY (pozitif ton)
  // =========================
  BLUE_REV: {
    tone: "BUY",
    label: "Dip dönüş",
    sentence:
      "Sert düşüş sonrası dip dönüş (reversal) yapısı oluşmuş; tepki potansiyeli artar.",
  },
  RSI_BULLDIV3: {
    tone: "BUY",
    label: "RSI uyumsuzluk",
    sentence:
      "3 pivotlu RSI pozitif uyumsuzluk, satış baskısının zayıfladığına ve dipten dönüş ihtimaline işaret eder.",
  },
  RSI30_OK: {
    tone: "BUY",
    label: "Momentum dönüşü",
    sentence:
      "RSI 30 üzeri geri dönüş, aşırı satımdan çıkış ve momentum toparlanması sinyali verebilir.",
  },
  MACD_OK: {
    tone: "BUY",
    label: "Momentum dönüşü",
    sentence:
      "MACD kesişimi, momentumun yukarı yönlü döndüğünü ve hızlanma ihtimalini gösterir.",
  },
  "MA5/20_OK": {
    tone: "BUY",
    label: "Kısa trend",
    sentence:
      "MA5/MA20 yukarı kesişimi, kısa vadede trend başlangıcı/ivmelenme sinyali üretebilir.",
  },
  VWAP_UP: {
    tone: "BUY",
    label: "Trend teyidi",
    sentence:
      "Fiyatın VWAP üzerinde kalması, gün içi trend teyidi ve alıcı kontrolünün güçlendiği şeklinde okunabilir.",
  },
  VOL_UP: {
    tone: "BUY",
    label: "Katılım artışı",
    sentence:
      "Hacim artışı, hareketin katılımla desteklendiğini ve sinyal kalitesinin güçlendiğini gösterir.",
  },
  GC_OK: {
    tone: "BUY",
    label: "Uzun trend",
    sentence:
      "Golden Cross (MA50>MA200), uzun vadeli rejimde pozitifleşme ihtimalini artırır (tek başına yeterli değildir).",
  },
  D1_CONFIRM: {
    tone: "BUY",
    label: "MTF onay",
    sentence:
      "Günlük zaman dilimi onayı, daha büyük resimde trendin desteklendiğine işaret eder.",
  },

  // =========================
  // SELL (uyarı ton)
  // =========================
  TOP_REV: {
    tone: "SELL",
    label: "Tepe dönüş",
    sentence:
      "Aşırı yükseliş sonrası tepe dönüş (reversal) yapısı, kâr satışı ve geri çekilme riskini artırır.",
  },
  RSI_BEARDIV3: {
    tone: "SELL",
    label: "RSI uyumsuzluk",
    sentence:
      "3 pivotlu RSI negatif uyumsuzluk, yükselişte momentum kaybı ve tepe oluşumu riskine işaret eder.",
  },
  RSI70_DN: {
    tone: "SELL",
    label: "Momentum zayıf",
    sentence:
      "RSI’nin 70 altına sarkması, aşırı alım sonrası soğuma ve momentum zayıflaması göstergesi olabilir.",
  },
  VWAP_DN: {
    tone: "SELL",
    label: "Trend zayıf",
    sentence:
      "Fiyatın VWAP altına inmesi, gün içi trend zayıflaması ve satıcılı rejime geçiş uyarısıdır.",
  },
  "MA5/20_DN": {
    tone: "SELL",
    label: "Kısa trend kırılımı",
    sentence:
      "MA5/MA20 aşağı kesişimi, kısa vadeli zayıflama ve geri çekilme riskini yükseltir.",
  },
  BEAR_CANDLE: {
    tone: "SELL",
    label: "Ayı mum",
    sentence:
      "Ayı mum formasyonları satış baskısını artırabilir; özellikle tepe bölgelerinde teyit aramak gerekir.",
  },
  VOL_DUMP: {
    tone: "SELL",
    label: "Dağıtım / dump",
    sentence:
      "Artan hacimle düşüş, dağıtım (distribution) ihtimalini artırır; satış baskısı güçleniyor olabilir.",
  },
};