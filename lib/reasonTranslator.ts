// src/lib/reasonTranslator.ts

export const REASON_TO_TECH: Record<string, string> = {
  MACD_OK: "MACD kesişimi momentum dönüşüne işaret ediyor",
  RSI30_OK: "RSI 30 üzeri dönüşle birlikte dipten toparlanma sinyali üretiyor",
  MA5_20_OK: "Kısa vadeli hareketli ortalamalar yukarı kesişim gösteriyor",
  VWAP_UP: "Fiyatın VWAP üzeri kalması trend teyidi sağlıyor",
  VOL_UP: "Hacim artışı piyasaya katılımın güçlendiğini gösteriyor",
  D1_CONFIRM: "Günlük zaman diliminde trend onayı mevcut",
  GC_OK: "Uzun vadeli trend Golden Cross ile destekleniyor",
  RSI_BULLDIV3: "RSI pozitif uyumsuzluğu dipten dönüş potansiyeline işaret ediyor",
  BLUE_REV: "Sert düşüş sonrası dipten dönüş formasyonu oluşmuş görünüyor",

  // SELL tarafı
  RSI70_DN: "RSI 70 altına sarkarak momentum kaybına işaret ediyor",
  VWAP_DN: "Fiyat VWAP altına inerek trend zayıflaması gösteriyor",
  MA5_20_DN: "Kısa vadeli ortalamalar aşağı kesişim yapıyor",
  BEAR_CANDLE: "Ayı mum formasyonu satış baskısını artırıyor",
  VOL_DUMP: "Artan hacimle birlikte satış baskısı güçleniyor",
  RSI_BEARDIV3: "RSI negatif uyumsuzluğu tepe oluşumuna işaret ediyor",
  TOP_REV: "Aşırı yükseliş sonrası tepe dönüş sinyali oluşmuş görünüyor",
};

function parseReasonKeys(details?: string | null) {
  const raw = (details ?? "").trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((token) => token.split("(")[0]?.trim())
    .filter(Boolean);
}

export function reasonsToTechSentences(details?: string | null) {
  const keys = parseReasonKeys(details);

  const sentences = keys
    .map((k) => REASON_TO_TECH[k])
    .filter(Boolean);

  const uniq = Array.from(new Set(sentences));

  return uniq.length
    ? uniq.slice(0, 4).join(". ") + "."
    : "";
}