// src/constants/terminal.ts

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
    "THYAO","ASELS","EREGL","KCHOL","SISE","GARAN","AKBNK","YKBNK","BIMAS","TUPRS",
    "SAHOL","FROTO","KRDMD","PETKM","TOASO","TCELL","TTKOM","KOZAL","KOZAA","HEKTS"
  ],
} as const;

export type AssetCategory = keyof typeof ASSETS;
export const ASSET_LISTS: Record<AssetCategory, readonly string[]> = ASSETS;

// ── UI Rozet Metinleri ────────────────────────────
export const REASON_LABEL: Record<string, string> = {
  // BUY
  BLUE_STAR: "⭐ Mavi Yıldız",
  RSI_DIV: "🟤 RSI Uyumsuzluk",
  RSI_30: "🟣 RSI 30 Üstü",
  MACD_BULL: "📈 MACD Bull Cross",
  MA5_20_UP: "📊 MA5 > MA20",
  VWAP_UP: "🟦 VWAP Üstü",
  VOL_BOOST: "📊 Hacim Artışı",
  GOLDEN_CROSS: "🟡 Golden Cross",
  FALLING_WEDGE: "🔺 Düşen Takoz (Falling Wedge)",
  BULL_FLAG: "🏁 Flama (Bull Flag)",
  D1_CONFIRM: "🟩 Günlük Onay",

  // SELL
  RED_STAR: "🔻 Kırmızı Yıldız",
  RSI_70_DOWN: "🔴 RSI 70 Altı",
  MACD_BEAR: "📉 MACD Bear Cross",
  MA5_20_DOWN: "⚠️ MA5 < MA20",
  VWAP_DOWN: "🔻 VWAP Altı",
  SELL_PRESSURE: "⚡ Satış Baskısı (Hacim)",
  DEATH_CROSS: "⚫ Death Cross",
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
  const k = raw.split("(")[0].trim();

  const map: Record<string, string> = {
    // BUY
    BLUE_REV: "BLUE_STAR",
    RSI_BULLDIV3: "RSI_DIV",
    RSI30_OK: "RSI_30",
    MACD_OK: "MACD_BULL",
    "MA5/20_OK": "MA5_20_UP",
    VWAP_UP: "VWAP_UP",
    VOL_UP: "VOL_BOOST",
    GC_OK: "GOLDEN_CROSS",
    FALLING_WEDGE: "FALLING_WEDGE",
    BULL_FLAG: "BULL_FLAG",
    FLAG_BREAKOUT: "BULL_FLAG",
    D1_CONFIRM: "D1_CONFIRM",

    // SELL
    TOP_REV: "RED_STAR",
    RSI_BEARDIV3: "RSI_DIV",
    RSI70_DN: "RSI_70_DOWN",
    MACD_DN: "MACD_BEAR",
    VWAP_DN: "VWAP_DOWN",
    "MA5/20_DN": "MA5_20_DOWN",
    BEAR_CANDLE: "SELL_PRESSURE",
    VOL_DUMP: "SELL_PRESSURE",
    DEATH_CROSS: "DEATH_CROSS",
  };

  return map[k] ?? k;
}

export function parseReasons(reasons: string | null) {
  return (reasons || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeReasonKey);
}