// src/lib/reasonMap.ts
export const REASON_TO_TECH: Record<string, string> = {
  // =========================
  // BUY tarafı (Pine keys)
  // =========================
  BLUE_REV:
    "Sert düşüş sonrası dip dönüş (reversal) yapısı oluşmuş; tepki ihtimalini artırır.",
  RSI_BULLDIV3:
    "3 pivotlu RSI pozitif uyumsuzluk, satış baskısının zayıfladığına ve dipten dönüş ihtimaline işaret eder.",
  RSI30_OK:
    "RSI 30 üzeri geri dönüş, aşırı satımdan çıkış ve momentum toparlanması sinyali verebilir.",
  MACD_OK:
    "MACD kesişimi, momentumun yukarı yönlü döndüğüne işaret eder.",
  "MA5/20_OK":
    "MA5/MA20 yukarı kesişimi, kısa vadeli trend başlangıcı/ivmelenme sinyali üretebilir.",
  VWAP_UP:
    "Fiyatın VWAP üzerinde kalması, gün içi trend teyidi ve alıcı kontrolünün güçlendiği şeklinde okunabilir.",
  VOL_UP:
    "Hacim artışı, hareketin katılımla desteklendiğini ve sinyalin ciddiyetinin arttığını gösterir.",
  GC_OK:
    "Golden Cross (MA50>MA200), uzun vadeli trend dönüşü ve pozitif rejim ihtimalini güçlendirir.",
  D1_CONFIRM:
    "Günlük zaman dilimi onayı, daha büyük resimde trendin desteklendiğine işaret eder.",

  // =========================
  // SELL tarafı (Pine keys)
  // =========================
  TOP_REV:
    "Aşırı yükseliş sonrası tepe dönüş (reversal) yapısı, kâr satışları ve geri çekilme riskini artırır.",
  RSI_BEARDIV3:
    "3 pivotlu RSI negatif uyumsuzluk, yükselişte momentum kaybı ve tepe oluşumu riskine işaret eder.",
  RSI70_DN:
    "RSI’nin 70 altına sarkması, aşırı alım sonrası soğuma ve momentum zayıflaması göstergesi olabilir.",
  VWAP_DN:
    "Fiyatın VWAP altına inmesi, trend zayıflaması ve satıcılı rejime geçiş uyarısıdır.",
  "MA5/20_DN":
    "MA5/MA20 aşağı kesişimi, kısa vadeli zayıflama ve geri çekilme riskini yükseltir.",
  BEAR_CANDLE:
    "Ayı mum formasyonları satış baskısını artırır; özellikle tepe bölgelerinde dikkat gerektirir.",
  VOL_DUMP:
    "Artan hacimle düşüş (distribution) ihtimalini artırır; satış baskısı güçleniyor olabilir.",
};