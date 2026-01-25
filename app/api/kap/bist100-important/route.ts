// app/api/kap/bist100-important/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ BIST100 listesi (istersen sonra dış dosyaya taşırız)
const BIST100 = [
  "AEFES","AGHOL","AKBNK","AKSA","AKSEN","ALARK","ARCLK","ARDYZ","ASELS","ASTOR",
  "BIMAS","BRISA","CANTE","CCOLA","CIMSA","DOAS","ECILC","EGEEN","EKGYO","ENERY",
  "ENJSA","ENKAI","EREGL","FROTO","GARAN","GESAN","GUBRF","HALKB","HEKTS","ISCTR",
  "ISGYO","ISMEN","KARSN","KCAER","KCHOL","KONTR","KOZAA","KOZAL","KRDMD","LOGO",
  "MAVI","MGROS","MIATK","ODAS","OTKAR","OYAKC","PETKM","PGSUS","SAHOL","SASA",
  "SDTTR","SELEC","SISE","SKBNK","SMRTG","SOKM","TABGD","TAVHL","TCELL","THYAO",
  "TKFEN","TOASO","TSKB","TTKOM","TTRAK","TUPRS","ULKER","VAKBN","VESBE","VESTL","EGEEN","CMBTN","MRSHL","YKBNK","ZOREN"
  // Not: BIST100 zamanla değişebilir. İstersen bunu otomatik güncelleyen bir modül yaparız.
];

const IMPORTANT_KEYWORDS = [
  "finansal","bilanço","sonuç",
  "bedelsiz","bedelli",
  "temettü","kâr payı","kar payı",
  "geri alım","pay geri alım",
  "sözleşme","anlaşma","ihale",
  "birleşme","satın al","devral",
  "spk","sermaye piyasası",
  "kredi","borçlanma","tahvil","bono",
  "yatırım","kapasite","tesis",
  "ceza","inceleme","soruşturma",
];

function isImportant(text: string) {
  const t = (text || "").toLowerCase();
  return IMPORTANT_KEYWORDS.some((k) => t.includes(k));
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

    const since = Date.now() - 24 * 60 * 60 * 1000;

    const filtered = (Array.isArray(items) ? items : []).filter((it: any) => {
      const t = safeTimeMs(it.publishDate);
      if (!t || t < since) return false;

      const codes = extractCodes(it.stockCodes);
      const isBist100 = codes.some((c) => BIST100.includes(c));
      if (!isBist100) return false;

      const text = `${it.kapTitle ?? ""} ${it.summary ?? ""} ${it.disclosureClass ?? ""}`;
      return isImportant(text);
    });

    filtered.sort((a: any, b: any) => safeTimeMs(b.publishDate) - safeTimeMs(a.publishDate));

    return NextResponse.json({
      count: filtered.length,
      data: filtered.slice(0, 30),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "KAP error" },
      { status: 500 }
    );
  }
}