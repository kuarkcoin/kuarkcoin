// app/api/kap/bist100-important/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ BIST100 (zamanla değişebilir; istersen ayrı dosyaya alırız)
const BIST100 = [
  "AEFES","AGHOL","AKBNK","AKSA","AKSEN","ALARK","ARCLK","ARDYZ","ASELS","ASTOR",
  "BIMAS","BRISA","BSOKE","CIMSA","CANTE","CCOLA","DOAS","ECILC","EGEEN","EKGYO",
  "ENERY","ENJSA","ENKAI","EREGL","FROTO","GARAN","GESAN","GUBRF","HALKB","HEKTS",
  "ISCTR","ISGYO","ISMEN","KARSN","KCAER","KCHOL","KONTR","KOZAA","KOZAL","KRDMD",
  "KRONT","LOGO","MAVI","MGROS","MIATK","ODAS","OTKAR","OYAKC","PETKM","PGSUS",
  "SAHOL","SASA","SDTTR","SELEC","SISE","SKBNK","SMRTG","SOKM","TABGD","TAVHL",
  "TCELL","THYAO","TKFEN","TOASO","TSKB","TTKOM","TTRAK","TUPRS","ULKER","VAKBN","CMBTN","MRSHL",
"VESBE","VESTL","YATAS","YKBNK","ZOREN",
];

// --------------------
// 1) Etiket sistemi
// --------------------
type KapTag =
  | "IS_ANLASMASI"
  | "SATIN_ALMA"
  | "BIRLESME"
  | "YUKSEK_KAR"
  | "TEMETTU"
  | "GERI_ALIM"
  | "NEGATIF"
  | "DIGER";

const TAG_KEYWORDS: Record<KapTag, string[]> = {
  IS_ANLASMASI: [
    "iş anlaşması",
    "sözleşme imzalan",
    "sözleşme",
    "anlaşma sağlan",
    "ihale kazan",
    "ihale",
    "proje sözleşmesi",
    "sipariş al",
    "sipariş",
  ],

  SATIN_ALMA: [
    "satın alma",
    "pay devri",
    "hisse devri",
    "devralma",
    "iştirak edinimi",
    "edinim",
  ],

  BIRLESME: [
    "birleşme",
    "birleşme işlemi",
    "kolaylaştırılmış birleşme",
    "bölünme",
    "kısmi bölünme",
  ],

  YUKSEK_KAR: [
    "finansal sonuç",
    "bilanço",
    "faaliyet sonuç",
    "net dönem kârı",
    "net donem kari",
    "kâr art",
    "kar art",
    "rekor",
    "yüksek kâr",
    "yuksek kar",
  ],

  TEMETTU: [
    "temettü",
    "kâr payı",
    "kar payi",
    "nakit temettü",
    "kar dağıt",
    "kâr dağıt",
  ],

  GERI_ALIM: [
    "geri alım",
    "pay geri alım",
    "hisse geri alım",
    "geri alim",
  ],

  NEGATIF: [
    "zarar",
    "ceza",
    "inceleme",
    "soruşturma",
    "iptal",
    "fesih",
    "durdur",
    "dava",
    "iflas",
  ],

  DIGER: [],
};

const BULLISH_TAGS: KapTag[] = [
  "IS_ANLASMASI",
  "SATIN_ALMA",
  "BIRLESME",
  "YUKSEK_KAR",
  "TEMETTU",
  "GERI_ALIM",
];

function detectKapTags(text: string): KapTag[] {
  const t = (text || "").toLowerCase();
  const tags: KapTag[] = [];

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k))) tags.push(tag as KapTag);
  }

  return tags.length ? tags : ["DIGER"];
}

// KAP stockCodes bazen "THYAO,PGSUS" gibi geliyor.
function extractCodes(stockCodes: any): string[] {
  const raw = String(stockCodes ?? "").toUpperCase();
  if (!raw) return [];
  return raw
    .split(/[\s,;|/]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function safeTimeMs(value: any): number {
  if (!value) return 0;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export async function GET() {
  try {
    const r = await fetch("https://www.kap.org.tr/tr/api/memberDisclosureQuery", {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        fromDate: "",
        toDate: "",
        subjectList: [],
        bdkMemberOidList: [],
        srcCategory: "4",
      }),
      cache: "no-store",
    });

    if (!r.ok) throw new Error(`KAP API error: ${r.status}`);

    const items = await r.json();

    // Son 24 saat
    const since = Date.now() - 24 * 60 * 60 * 1000;

    const filtered = (Array.isArray(items) ? items : [])
      .map((it: any) => {
        const text = `${it.kapTitle ?? ""} ${it.summary ?? ""} ${it.disclosureClass ?? ""}`;
        const tags = detectKapTags(text);
        return { ...it, tags };
      })
      .filter((it: any) => {
        // 1) zaman filtresi
        const t = safeTimeMs(it.publishDate);
        if (!t || t < since) return false;

        // 2) BIST100 filtresi
        const codes = extractCodes(it.stockCodes);
        const isBist100 = codes.some((c) => BIST100.includes(c));
        if (!isBist100) return false;

        // 3) Negatifleri at (istersen bunu kapatabiliriz)
        const tags: KapTag[] = Array.isArray(it.tags) ? it.tags : [];
        if (tags.includes("NEGATIF")) return false;

        // 4) Sadece yükseltici türler
        const isBullish = tags.some((t) => BULLISH_TAGS.includes(t));
        return isBullish;
      });

    // Yeni -> eski sırala
    filtered.sort((a: any, b: any) => safeTimeMs(b.publishDate) - safeTimeMs(a.publishDate));

    return NextResponse.json({
      count: filtered.length,
      data: filtered.slice(0, 30),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "KAP error" }, { status: 500 });
  }
}