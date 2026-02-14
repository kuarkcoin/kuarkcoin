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
"VAKKO","VESBE","YATAS","OZYSR","KLYPV","ZOREN",

    // (istersen buraya kalan BIST 100 hisselerini de ekleyebilirsin)

    // ===== ÖZEL / AZ LOT / YÜKSEK POTANSİYEL =====
    "CMBTN",
    "MRSHL",
    "EGEEN",
    "CLEBI"
  ],
} as const;

export const WATCHLISTS = {
  NASDAQ250: [
    "AAPL","MSFT","NVDA","AMZN","GOOGL","GOOG","META","TSLA","AVGO","COST",
    "ADBE","AMD","NFLX","CSCO","INTC","PEP","TMUS","CMCSA","TXN","AMGN",
    "QCOM","HON","INTU","BKNG","SBUX","ISRG","GILD","MDLZ","ADI","VRTX",
    "REGN","ADP","PANW","LRCX","MU","KLAC","SNPS","CDNS","ORLY","MAR",
    "ASML","MRVL","ABNB","CRWD","NXPI","FTNT","TEAM","KDP","PAYX","ODFL",
    "CSX","MNST","MELI","ROST","PCAR","CHTR","DXCM","ILMN","IDXX","BIIB",
    "FAST","CPRT","EA","VRSK","DDOG","ZS","OKTA","DOCU","NET","MDB",
    "SHOP","SQ","PYPL","UBER","LYFT","SNOW","PLTR","RBLX","COIN","HOOD",
    "ARM","SMCI","ON","WBD","FANG","EXPE","CTSH","TTD","ANSS","BIDU",
    "JD","PDD","BABA","NTES","TCOM","ZSAN","ALGN","ENPH","SEDG","MRNA",
    "BMRN","SGEN","VEEV","SIRI","FOX","FOXA","CSGP","WDAY","XEL","AEP",
    "LULU","ETSY","KHC","ZM","PTON","DOCS","FIVN","RIVN","LCID","NIO",
    "XP","SE","AFRM","UPST","SOFI","PATH","U","DKNG","FSLY","TWLO",
    "APP","GFS","TER","MCHP","MPWR","AME","BRO","WAT","POOL","JBHT",
    "UAL","DAL","AAL","RCL","CCL","NCLH","UAL","UAL","UAL","UAL"
  ],
  NASDAQ_ETFS: [
    "QQQ","QQQM","TQQQ","SQQQ","QQQS","ONEQ",
    "SPY","VOO","IVV","VTI","DIA","IWM",
    "SMH","SOXX","XLK","XLY","XLF","XLE","XLV","XLI","XLP","XLB","XLU","XLC",
    "ARKK","ARKQ","ARKW","ARKG","ARKF",
    "VUG","VTV","MGK","SCHG","IWF",
    "GLD","SLV","USO","UNG",
    "TLT","IEF","SHY","HYG","LQD",
    "BITO","IBIT","GBTC","ETHE"
  ],
  BIST150: [
    "AKBNK","ALARK","ARCLK","ASELS","ASTOR","AYGAZ","BIMAS","BRYAT","CCOLA","CIMSA",
    "DOAS","EGEEN","EKGYO","ENKAI","EREGL","FROTO","GARAN","GUBRF","HEKTS","ISCTR",
    "ISDMR","KCHOL","KONTR","KOZAA","KOZAL","MGROS","ODAS","OTKAR","PETKM","PGSUS",
    "SAHOL","SASA","SISE","TAVHL","TCELL","THYAO","TOASO","TSKB","TUPRS","ULKER",
    "VAKBN","YKBNK","ZOREN","ALFAS","SMRTG","GWIND","EUPWR","AKSEN","ENJSA","KRDMD",
    "KORDS","OYAKC","AKSA","BRISA","BRSAN","CANTE","DEVA","ECILC","GENIL","INDES","OZYSR","KLYPV","KARSN","LOGO","MAVI","NETAS","SELEC","SKBNK","TKFEN","TRGYO","VESBE","YATAS",
    "ZRGYO","AKFGY","AKMGY","ALGYO","ANSGR","ASELS","BAGFS","BIOEN","CEMTS","CLEBI",
    "CWENE","DURDO","FMIZP","GESAN","ISGYO","KMPUR","KZBGY","MIATK","MPARK","NTHOL",
    "ODAS","PENTA","QUAGR","RAYSG","SDTTR","SNICA","SOKM","TTRAK","ULUUN","USAK",
    "YUNSA","ZEDUR","ARDYZ","KFEIN","GIPTA","BINHO","LINK","RTALB"
  ],
} as const;

export type AssetCategory = keyof typeof ASSETS;
export const ASSET_LISTS: Record<AssetCategory, readonly string[]> = ASSETS;

// ── UI Rozet Metinleri ────────────────────────────
export const REASON_LABEL: Record<string, string> = {
  // BUY
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

  // SELL
  RED_STAR: "🔻 Kırmızı Yıldız",
  RSI_70_DOWN: "🔴 RSI 70 Altı",
  VWAP_DOWN: "🔻 VWAP Altı",
  MA5_20_DOWN: "⚠️ MA5 < MA20",
  SELL_CANDLE: "🕯️ Bear Candle",
  SELL_PRESSURE: "⚡ Satış Baskısı (Hacim)",
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
  // "RSI30_OK(+20)" gibi stringlerden sadece anahtar kısmını al
  const k = raw.split("(")[0].trim();

  const map: Record<string, string> = {
    // BUY
    BLUE_REV: "BLUE_STAR",
    RSI_BULLDIV3: "RSI_DIV",
    HID_BULLDIV3: "HID_DIV",
    MULTIDIV: "MULTIDIV",
    RSI30_OK: "RSI_30",
    MACD_OK: "MACD_BULL",
    "MA5/20_OK": "MA5_20_UP",
    VWAP_UP: "VWAP_UP",
    VOL_UP: "VOL_BOOST",
    GC_OK: "GOLDEN_CROSS",
    D1_CONFIRM: "D1_CONFIRM",
    FLAG_BRK: "BULL_FLAG",
    FLAG_BREAKOUT: "BULL_FLAG",
    BULL_FLAG: "BULL_FLAG",
    NEAR_SUP: "NEAR_SUP",
    NEAR_RES: "NEAR_RES",

    // SELL
    TOP_REV: "RED_STAR",
    RSI_BEARDIV3: "RSI_DIV",
    HID_BEARDIV3: "HID_DIV",
    RSI70_DN: "RSI_70_DOWN",
    VWAP_DN: "VWAP_DOWN",
    "MA5/20_DN": "MA5_20_DOWN",
    BEAR_CANDLE: "SELL_CANDLE",
    VOL_DUMP: "SELL_PRESSURE",
  };

  return map[k] ?? k;
}

// reasons parsing (dedupe + boşları at)
export function parseReasons(reasons: string | null) {
  const keys = (reasons || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeReasonKey);

  // aynı rozet tekrar basmasın
  return Array.from(new Set(keys));
}
