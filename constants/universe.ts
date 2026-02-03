// src/constants/universe.ts

// =====================
// NASDAQ 300 (plain tickers)
// =====================
export const NASDAQ300 = [
  "AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","TSLA","AVGO","ADBE",
  "COST","PEP","CSCO","NFLX","TMUS","INTC","AMD","QCOM","AMGN","TXN",
  "HON","INTU","SBUX","BKNG","AMAT","ISRG","ADI","GILD","MU","LRCX",
  "VRTX","MDLZ","REGN","PANW","SNPS","KLAC","MELI","CDNS","ASML","PDD",
  "CRWD","ABNB","ADP","MAR","CTAS","CHTR","ORLY","PAYX","CSX","MRNA",
  "KDP","NXPI","FTNT","WDAY","KHC","AEP","MNST","ROST","PCAR","EXC",
  "AZN","ZS","TEAM","DDOG","MRVL","DXCM","BIIB","ILMN","IDXX","LULU",
  "EA","ODFL","FAST","VRSK","XEL","GEHC","ANSS","CPRT","TTWO","MCHP",
  "CTSH","FANG","WBD","BKR","DLTR","EBAY","SIRI","LCID","RIVN","ENPH",
  "ALGN","WBA","DOCU","OKTA","NET","ROKU","COIN","SQ","PYPL","SHOP",
  "ZM","U","PLTR","CRSP","NTES","BIDU","JD","BABA","NTDOY","TSM",
  "SPLK","MDB","NOW","ARM","SMCI","ANET","GFS","ON","MRNA","SGEN",
  "ADSK","VOD","ERIC","TTD","MSTR","AFRM","FIVN","TWLO","PINS","SNOW",
  "UBER","LYFT","DASH","ABNB","BKNG","EXPE","TRIP","ZG","Z","MTCH",
  "RGEN","INCY","SIRI","FOXA","FOX","TTWO","ATVI","EA","ROST","ULTA",
  "KMB","KDP","MDLZ","HSIC","XRAY","WDC","STX","HPQ","DELL","LOGI",
  "SWKS","QRVO","TER","GLW","NTAP","CDW","AKAM","CHKP","GEN","CYBR",
  "DOCN","FSLY","ESTC","DT","GTLB","ASAN","HUBS","JBLU","SAVE","ALK",
  "UAL","AAL","DAL","LUV","ZION","FITB","HBAN","RF","KEY","CFG",
  "PNFP","SIVB","WAL","PACW","FULT","IBKR","SCHW","LPLA","HOOD","NDAQ",
  "CME","ICE","MSCI","SPGI","FISV","PAYC","PYPL","INTU","ADP","WEX",
  "FIS","GPN","TOST","BILL","RIOT","MARA","HUT","CLSK","IREN","BTBT",
  "TSLA","NIO","XPEV","LI","F","GM","LCID","RIVN","LAZR","MVIS",
  "PTON","NWL","HAS","MAT","CROX","DECK","NKE","UAA","UA","SKX",
  "ETSY","CHWY","W","OSTK","AMZN","WMT","TGT","COST","BJ","KR",
  "SFM","WOOF","CVNA","KMX","ABG","PAG","GPI","LAD","CPRT","KAR",
  "PODD","TNDM","ALNY","BMRN","SRPT","IONS","EXAS","VCYT","FATE","BEAM",
  "MRNA","BNTX","NVAX","VIR","REGN","VRTX","GILD","BIIB","ILMN","IDXX",
  "SPLK","CRM","ORCL","SAP","IBM","HPE","DELL","HPQ","STNE","NU",
  "SE","GRAB","GTLB","DOCU","BOX","DBX","ZI","FROG","PATH","S",
  "ADBE","ADSK","INTU","SNPS","CDNS","ANSS","PTC","BSY","SSNC","MANH",
  "ORCL","MSFT","GOOG","GOOGL","META","AMZN","NFLX","TSLA","NVDA","AMD",
  "INTC","QCOM","AVGO","TXN","ADI","MU","LRCX","AMAT","KLAC","MCHP",
  "NXPI","ASML","MRVL","ON","GFS","TER","SWKS","QRVO","MPWR","ENTG",
  "PANW","CRWD","FTNT","ZS","OKTA","NET","DDOG","MDB","SNOW","TEAM",
  "NOW","WDAY","VEEV","HUBS","SPLK","DOCN","ESTC","DT","GTLB","ASAN",
  "ANET","CSCO","AKAM","CHKP","GEN","CYBR","S","RPD","TENB","SNYK",
  "BKNG","ABNB","EXPE","DASH","UBER","LYFT","ROKU","SPOT","TTD","PINS",
  "PYPL","SQ","SHOP","ZM","U","PLTR","COIN","HOOD","IBKR","SCHW",
  "AMGN","REGN","VRTX","GILD","BIIB","ILMN","IDXX","ALNY","BMRN","SRPT",
  "AEP","XEL","EXC","PCAR","CSX","ODFL","FAST","VRSK","CTAS","PAYX",
  "SBUX","MNST","KDP","MDLZ","ROST","DLTR","ORLY","COST","PEP","INTU"
].slice(0, 300); // güvenlik: yanlışlıkla 300+ olursa kırp

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