// src/constants/universe.ts

// =====================
// NASDAQ 100 (plain tickers)
// Kaynak kapsam: NASDAQ-100 bileşen sembolleri. Birden fazla pay sınıfı
// nedeniyle sembol sayısı 100'den fazla olabilir (örn. GOOG/GOOGL).
// =====================
export const EXPECTED_NASDAQ100_SYMBOL_COUNT = 101 as const;

export const NASDAQ100 = [
  "ADBE","AMD","ABNB","ALNY","GOOGL","GOOG","AMZN","AEP","AMGN","ADI",
  "AAPL","AMAT","APP","ARM","ASML","ADSK","ADP","AXON","BKR","BKNG",
  "AVGO","CDNS","CHTR","CTAS","CSCO","CCEP","CTSH","CMCSA","CEG","CPRT",
  "COST","CRWD","CSX","DDOG","DXCM","FANG","DASH","EA","EXC","FAST",
  "FER","FTNT","GEHC","GILD","HON","IDXX","INSM","INTC","INTU","ISRG",
  "KDP","KLAC","KHC","LRCX","LIN","LITE","MAR","MRVL","MELI","META",
  "MCHP","MU","MSFT","MSTR","MDLZ","MPWR","MNST","NFLX","NVDA","NXPI",
  "ORLY","ODFL","PCAR","PLTR","PANW","PAYX","PYPL","PDD","PEP","QCOM",
  "REGN","ROP","ROST","SNDK","STX","SHOP","SBUX","SNPS","TMUS","TTWO",
  "TSLA","TXN","TRI","VRSK","VRTX","WMT","WBD","WDC","WDAY","XEL",
  "ZS",
] as const;


// =====================
// ETF (20 adet)
// =====================
export const ETFS = [
  "SPY","QQQ","IWM","DIA","VTI",
  "VOO","SCHD","SMH","XLK","XLF",
  "XLE","XLV","XLY","XLP","XLI",
  "XLB","XLU","XLC","GLD","TLT",
];

// =====================
// BIST 100 (100 adet)
// =====================
export const BIST100 = [
  "AKBNK","ALARK","ARCLK","ASELS","BIMAS","BRYAT","CIMSA","DOAS","EKGYO","ENJSA",
  "EREGL","FROTO","GARAN","GUBRF","HALKB","HEKTS","ISCTR","KCHOL","KOZAA","KOZAL",
  "KRDMD","MGROS","PETKM","SAHOL","SISE","TCELL","THYAO","TOASO","TTKOM","TUPRS",
  "YKBNK","AKSA","ASUZU","BAGFS","BANVT","BERA","BRSAN","CCOLA","CANTE","CEMAS",
  "CEMTS","CLEBI","CRFSA","CWENE","DURDO","EGEEN","ENKAI","FENER","GESAN","GIPTA",
  "GOLTS","GWIND","HDFGS","INDES","ISMEN","KARSN","KERVT","KONYA","KORDS","KRVGD",
  "LOGO","MAVI","MIATK","MPARK","NETAS","ODAS","OTKAR","OYAKC","PAPIL","PGSUS",
  "POLTK","QUAGR","RAYSG","RTALB","SDTTR","SELEC","SMRTG","SNICA","SODSN","SUMAS",
  "TAVHL","TKFEN","TRGYO","TSKB","TTWO","TTRAK","TURGG","ULKER","USAK","VAKKO",
  "VESBE","VESTL","YATAS","ZOREN","AGHOL","AGESA","AKGRT","ALCAR","CLEBI","LINK"
].slice(0, 100); // güvenlik: yanlışlıkla 100+ olursa kırp