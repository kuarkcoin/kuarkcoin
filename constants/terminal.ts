// src/constants/terminal.ts

// =====================
// ASSETS
// =====================
export const ASSETS = {
  NASDAQ: [
    "AAPL","MSFT","TSLA","NVDA","AMZN","GOOGL","META","AVGO","PEP","COST",
    "ADBE","CSCO","AMD","NFLX","INTC","TMUS","CMCSA","TXN","AMGN","HON",
    "SBUX","INTU","GILD","MDLZ","ISRG","BKNG","ADI","ADP","VRTX","REGN",
  ],
  ETF: [
    "SPY","QQQ","IVV","VOO","GLD","VTI","IWM","DIA"
  ],
  CRYPTO: [
    "BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT"
  ],
} as const;

// 🔑 kritik tipler
export type AssetCategory = keyof typeof ASSETS;

// 🔑 TS’in never’a düşmemesi için güvenli map
export const ASSET_LISTS: Record<AssetCategory, readonly string[]> = ASSETS;

// =====================
// REASON LABELS
// =====================
export const REASON_LABEL: Record<string, string> = {
  BLUE_STAR: "⭐ Mavi Yıldız",
  RSI_DIV: "🟤 RSI Uyumsuzluk",
  RSI_30: "🟣 RSI 30 Üstü",
  MACD_BULL: "📈 MACD Bull Cross",
  MA5_20_UP: "📊 MA5 > MA20",
  VWAP_UP: "🟦 VWAP Üstü",
  VOL_BOOST: "📊 Hacim Artışı",
  GOLDEN_CROSS: "🟡 Golden Cross",
  D1_CONFIRM: "🟩 Günlük Onay",

  RED_STAR: "🔻 Kırmızı Yıldız",
  RSI_70_DOWN: "🔴 RSI 70 Altı",
  MACD_BEAR: "📉 MACD Bear Cross",
  MA5_20_DOWN: "⚠️ MA5 < MA20",
  VWAP_DOWN: "🔻 VWAP Altı",
  SELL_PRESSURE: "⚡ Satış Baskısı",
  DEATH_CROSS: "⚫ Death Cross",
};

// =====================
// HELPERS
// =====================
export function symbolToPlain(sym: string) {
  return sym.split(":")[1] ?? sym;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  return `${Math.floor(h / 24)}g`;
}

export function normalizeReasonKey(raw: string) {
  const k = raw.split("(")[0].trim();
  const map: Record<string, string> = {
    BLUE_REV: "BLUE_STAR",
    RSI_BULLDIV3: "RSI_DIV",
    RSI30_OK: "RSI_30",
    MACD_OK: "MACD_BULL",
    "MA5/20_OK": "MA5_20_UP",
    VWAP_UP: "VWAP_UP",
    VOL_UP: "VOL_BOOST",
    GC_OK: "GOLDEN_CROSS",
    D1_CONFIRM: "D1_CONFIRM",

    TOP_REV: "RED_STAR",
    RSI_BEARDIV3: "RSI_DIV",
    RSI70_DN: "RSI_70_DOWN",
    MACD_DN: "MACD_BEAR",
    "MA5/20_DN": "MA5_20_DOWN",
    VWAP_DN: "VWAP_DOWN",
    BEAR_CANDLE: "SELL_PRESSURE",
    VOL_DUMP: "SELL_PRESSURE",
    DEATH_CROSS: "DEATH_CROSS",
  };
  return map[k] ?? k;
}

export function parseReasons(reasons: string | null) {
  return (reasons ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeReasonKey);
}