// reasonMap.ts (veya route içinde)
export const REASON_TO_TECH: Record<string, string> = {
  // BUY
  "MACD_OK": "MACD kesişimi momentum dönüşüne işaret ediyor",
  "VWAP_UP": "Fiyatın VWAP üzeri kalması trend teyidi olarak okunabilir",
  "VOL_UP": "Hacim artışı katılım artışına işaret ediyor",
  "D1_CONFIRM": "Günlük zaman dilimi onayı sinyal kalitesini güçlendiriyor",
  "GC_OK": "Golden Cross uzun vadeli trend dönüşü ihtimalini artırır",
  "MA5/20_OK": "Kısa vadeli ortalamaların yukarı kesişimi trend başlangıcı sinyali verebilir",
  "RSI30_OK": "RSI 30 üstüne dönüş tepki yükselişini destekleyebilir",
  "BLUE_REV": "Dip reversal yapısı dönüş ihtimalini güçlendiriyor",
  "RSI_BULLDIV3": "3 pivotlu RSI pozitif uyumsuzluk, zayıflayan satış baskısına işaret eder",

  // SELL
  "TOP_REV": "Tepe reversal yapısı kâr satışlarını ve dönüş riskini artırır",
  "RSI_BEARDIV3": "3 pivotlu RSI negatif uyumsuzluk momentum kaybına işaret eder",
  "RSI70_DN": "RSI 70 altına iniş aşırı alım sonrası soğumayı gösterebilir",
  "VWAP_DN": "VWAP altı fiyatlama zayıflama / trend bozulması sinyali olabilir",
  "MA5/20_DN": "Kısa vadeli ortalamaların aşağı kesişimi zayıflama sinyali verebilir",
  "BEAR_CANDLE": "Ayı mum formasyonu satış baskısının arttığını gösterebilir",
  "VOL_DUMP": "Hacimle gelen düşüş dağıtım/satış baskısı ihtimalini artırır",
};