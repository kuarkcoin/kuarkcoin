// src/constants/terminal.ts
import { normalizeReasonKey as normalizeSignalReasonKey, parseSignalIndicatorKeys } from "@/lib/normalize-signal-indicators";

// ── Asset listeleri ───────────────────────────────
export const ASSETS = {
  NASDAQ: [
    "AAPL","MSFT","TSLA","NVDA","AMZN","GOOGL","META","AVGO","PEP","COST",
    "ADBE","CSCO","AMD","NFLX","INTC","TMUS","CMCSA","TXN","AMGN","HON",
    "SBUX","INTU","GILD","MDLZ","ISRG","BKNG","ADI","ADP","VRTX","REGN",
    "PYPL","PANW","LRCX","MU","SNPS","CDNS","CSX","MAR","ORLY","KLAC",
    "MNST","ASML","MELI","CHTR","KDP","CTAS","ADSK","PAYX","PCAR","MCHC",
    "LULU","ON","MRVL","EXC","BKR","AEP","DXCM","IDXX","AZN","CPRT",
    "GFS","FAST","MCHP","ROST","CTSH","ODFL","TEAM","ILMN","ALGN","WBD",
    "JD","ZM","PDD","LCID","DDOG","ENPH","ABNB","WDAY","CEG","ANSS",
    "BIIB","MDB","DASH","ZS","KLA","EA","CTRA","VRSK","EBAY","DLTR",
    "ANET","CSGP","FTNT","MTCH","VRSN","SWKS","STX","WDC","TER","QRVO",
    "SEDG","AKAM","FSLR","ALNY","RIVN","OKTA","DBX","SPLK","NTES","BIDU",
    "PTON","DOCU","CRWD","NET","PATH","SNOW","U","AFRM","UPST","DKNG",
    "SHOP","SE","TME","BILI","FUTU","LI","XPEV","NIO","GRAB","GME",
    "AMC","PLTR","SOFI","COIN","HOOD","DNA","SQ","MQ","MARA","RIOT",
    "MSTR","CLSK","HUT","CAN","BTBT","TSM","BABA","IQ","EDU","TAL",
    "GOTU","DQ","JKS","CSIQ","SOL","SPI","SUNW","RUN","NOVA","HAS",
    "MAT","PARA","FOXA","DIS","RBLX","TTD","MGNI","PUBM","PERI","APPS",
    "STNE","PAGS","NU","DLO","XP","ITUB","BBD","BSBR","SAN","VALE"
  ],
  ETF: [
    "SPY","QQQ","IVV","VOO","GLD","VTI","VEA","VWO","IEFA","AGG",
    "BND","IJR","IWM","VTV","VUG","VXUS","IWF","IWD","VIG","IJH"
  ],
  CRYPTO: [
    "BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","AVAXUSDT",
    "DOGEUSDT","DOTUSDT","LINKUSDT","MATICUSDT","LTCUSDT","UNIUSDT","SHIBUSDT"
  ],
  BIST: [
    "AKBNK","ALARK","ARCLK","ASELS","BIMAS","BRYAT","CIMSA","DOAS","EKGYO",
    "ENJSA","EREGL","FROTO","GARAN","GUBRF","HALKB","HEKTS","ISCTR","KCHOL",
    "KOZAA","KOZAL","KRDMD","MGROS","PETKM","SAHOL","SISE","TCELL","THYAO",
    "TOASO","TTKOM","TUPRS","YKBNK","AEFES","AKGRT","AKSA","AKSEN","ALBRK","ALCAR","ALCTL","ALGYO","ANSGR","ARZUM",
"AYGAZ","BAGFS","BANVT","BERA","BIZIM","BRSAN","BUCIM","CCOLA","CEMTS","CRFSA",
"DEVA","DGNMO","DOHOL","DURDO","ECZYT","EDATA","EGGUB","ELITE","ENERY","ERCB",
"EREGLI","ESEN","EUPWR","FENER","FMIZP","GIPTA","GLYHO","GWIND","HALKS","HDFGS",
"ISDMR","ISMEN","IZFAS","JANTS","KAREL","KARSN","KATMR","KERVT","KFEIN","KLKIM",
"KONTR","KORDS","KRONT","LIDFA","LOGO","LUKSK","MAGEN","MAALT","MAVI","MEKAG",
"MPARK","NETAS","ODAS","OTKAR","PAPIL","PGSUS","QUAGR","RAYSG","RTALB","SDTTR",
"SELEC","SNICA","SODSN","SUMAS","TAVHL","TKFEN","TRGYO","TURGG","ULKER","USAK",
"VAKKO","VESBE","YATAS","ZOREN",

    // (istersen buraya kalan BIST 100 hisselerini de ekleyebilirsin)

    // ===== ÖZEL / AZ LOT / YÜKSEK POTANSİYEL =====
    "CMBTN",
    "MRSHL",
    "EGEEN",
    "CLEBI"
  ],
} as const;

export type AssetCategory = keyof typeof ASSETS;
export const ASSET_LISTS: Record<AssetCategory, readonly string[]> = ASSETS;

// ── UI Rozet Metinleri ────────────────────────────
export const REASON_LABEL: Record<string, string> = {
  // BUY / normalized
  BLUE_STAR: "⭐ Mavi Yıldız",
  RSI_DIV: "🟤 RSI Divergence",
  HID_DIV: "🟠 Hidden Divergence",
  MULTIDIV: "🧬 MultiDiv (RSI+MACD)",
  RSI_30: "🟣 RSI 30 Üstü",
  MACD_BULL: "📈 MACD Bull Cross",
  MA5_20_UP: "📊 MA5 > MA20",
  VWAP_UP: "🟦 VWAP Üstü",
  VOL_BOOST: "📊 Hacim Artışı",
  GOLDEN_CROSS: "🟡 Golden Cross",
  D1_CONFIRM: "🟩 Günlük Onay",
  BULL_FLAG: "🏁 Flama Breakout",
  NEAR_SUP: "🧱 Desteğe Yakın",
  NEAR_RES: "🧱 Dirence Yakın",
  COMBO_CAPITULATION: "⚡ Kapitülasyon Dönüşü",
  COMBO_SPRING_DIV: "🌱 Spring Divergence",
  COMBO_DB_BREAKOUT: "Ⓦ İkili Dip Kırılımı",

  // SELL / normalized
  RED_STAR: "🔻 Kırmızı Yıldız",
  RSI_70_DOWN: "🔴 RSI 70 Altı",
  VWAP_DOWN: "🔻 VWAP Altı",
  MA5_20_DOWN: "⚠️ MA5 < MA20",
  SELL_CANDLE: "🕯️ Bear Candle",
  SELL_PRESSURE: "⚡ Satış Baskısı (Hacim)",

  // Pine/raw aliases (tam uyumluluk için)
  BLUE_REV: "⭐ Mavi Yıldız",
  TOP_REV: "🔻 Kırmızı Yıldız",
  RSI_BULLDIV3: "🟤 RSI Bullish Divergence",
  RSI_BEARDIV3: "🔵 RSI Bearish Divergence",
  HID_BULLDIV3: "🟠 Hidden Bullish Divergence",
  HID_BEARDIV3: "🔵 Hidden Bearish Divergence",
  FLAG_BRK: "🏁 Flama Breakout",
  RSI30_OK: "🟣 RSI 30 Üstü",
  RSI70_DN: "🔴 RSI 70 Altı",
  MACD_OK: "📈 MACD Bull Cross",
  "MA5/20_OK": "📊 MA5 > MA20",
  "MA5/20_DN": "⚠️ MA5 < MA20",
  VWAP_DN: "🔻 VWAP Altı",
  VOL_UP: "📊 Hacim Artışı",
  VOL_DUMP: "⚡ Satış Baskısı (Hacim)",
  GC_OK: "🟡 Golden Cross",
  BEAR_CANDLE: "🕯️ Bear Candle",
};

// ── Yardımcılar ───────────────────────────────────
export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  return `${Math.floor(h / 24)}g`;
}

export function symbolToPlain(sym: string) {
  return sym?.split(":")[1] ?? sym;
}

// Pine → UI reason normalize
export function normalizeReasonKey(raw: string) {
  return normalizeSignalReasonKey(raw);
}

// reasons parsing (dedupe + boşları at)
export function parseReasons(reasons: string | null) {
  return parseSignalIndicatorKeys(reasons);
}
