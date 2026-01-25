// app/api/kap/bist100-important/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ BIST100 (zamanla değişebilir)
const BIST100 = [
  "AEFES","AGHOL","AKBNK","AKSA","AKSEN","ALARK","ARCLK","ARDYZ","ASELS","ASTOR",
  "BIMAS","BRISA","BSOKE","CIMSA","CANTE","CCOLA","DOAS","ECILC","EGEEN","EKGYO",
  "ENERY","ENJSA","ENKAI","EREGL","FROTO","GARAN","GESAN","GUBRF","HALKB","HEKTS",
  "ISCTR","ISGYO","ISMEN","KARSN","KCAER","KCHOL","KONTR","KOZAA","KOZAL","KRDMD",
  "KRONT","LOGO","MAVI","MGROS","MIATK","ODAS","OTKAR","OYAKC","PETKM","PGSUS",
  "SAHOL","SASA","SDTTR","SELEC","SISE","SKBNK","SMRTG","SOKM","TABGD","TAVHL",
  "TCELL","THYAO","TKFEN","TOASO","TSKB","TTKOM","TTRAK","TUPRS","ULKER","VAKBN",
  "VESBE","VESTL","YATAS","YKBNK","ZOREN",
  // sen eklemişsin:
  "CMBTN","MRSHL",
];

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
    if (keywords.length && keywords.some((k) => t.includes(k))) tags.push(tag as KapTag);
  }
  return tags.length ? tags : ["DIGER"];
}

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
  // ✅ KAP bazen yavaş → Home'u kilitlemesin diye timeout
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 2500);

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
      signal: ac.signal,
    });

    if (!r.ok) throw new Error(`KAP API error: ${r.status}`);

    const items = await r.json();

    const since = Date.now() - 24 * 60 * 60 * 1000;

    const filtered = (Array.isArray(items) ? items : [])
      .map((it: any) => {
        const text = `${it.kapTitle ?? ""} ${it.summary ?? ""} ${it.disclosureClass ?? ""}`;
        const tags = detectKapTags(text);
        return { ...it, tags };
      })
      .filter((it: any) => {
        const t = safeTimeMs(it.publishDate);
        if (!t || t < since) return false;

        const codes = extractCodes(it.stockCodes);
        if (!codes.some((c) => BIST100.includes(c))) return false;

        const tags: KapTag[] = Array.isArray(it.tags) ? it.tags : [];
        if (tags.includes("NEGATIF")) return false;

        return tags.some((tg) => BULLISH_TAGS.includes(tg));
      });

    filtered.sort((a: any, b: any) => safeTimeMs(b.publishDate) - safeTimeMs(a.publishDate));

    return NextResponse.json({
      count: filtered.length,
      data: filtered.slice(0, 30),
    });
  } catch (e: any) {
    // timeout olursa da boş dönüp UI'yı kilitlemeyelim
    const msg = e?.name === "AbortError" ? "KAP timeout" : (e?.message ?? "KAP error");
    return NextResponse.json({ count: 0, data: [], error: msg }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}