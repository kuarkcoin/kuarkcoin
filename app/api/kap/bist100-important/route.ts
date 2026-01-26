import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ BIST100 (zamanla değişebilir) — senin listeyi korudum
const BIST100 = [
  "AEFES","AGHOL","AKBNK","AKSA","AKSEN","ALARK","ARCLK","ARDYZ","ASELS","ASTOR",
  "BIMAS","BRISA","BSOKE","CIMSA","CANTE","CCOLA","DOAS","ECILC","EGEEN","EKGYO",
  "ENERY","ENJSA","ENKAI","EREGL","FROTO","GARAN","GESAN","GUBRF","HALKB","HEKTS",
  "ISCTR","ISGYO","ISMEN","KARSN","KCAER","KCHOL","KONTR","KOZAA","KOZAL","KRDMD",
  "KRONT","LOGO","MAVI","MGROS","MIATK","ODAS","OTKAR","OYAKC","PETKM","PGSUS",
  "SAHOL","SASA","SDTTR","SELEC","SISE","SKBNK","SMRTG","SOKM","TABGD","TAVHL",
  "TCELL","THYAO","TKFEN","TOASO","TSKB","TTKOM","TTRAK","TUPRS","ULKER","VAKBN",
  "VESBE","VESTL","YATAS","YKBNK","ZOREN",
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

type KapUIItem = {
  title: string;
  url: string;
  source: string;
  datetime: number; // unix sec
  company?: string;
  tags: KapTag[];
  stockCodes: string[];
  raw?: any;
};

const TAG_KEYWORDS: Record<KapTag, string[]> = {
  IS_ANLASMASI: ["iş anlaşması","sözleşme imzalan","sözleşme","anlaşma sağlan","ihale kazan","ihale","proje sözleşmesi","sipariş al","sipariş"],
  SATIN_ALMA: ["satın alma","pay devri","hisse devri","devralma","iştirak edinimi","edinim"],
  BIRLESME: ["birleşme","birleşme işlemi","kolaylaştırılmış birleşme","bölünme","kısmi bölünme"],
  YUKSEK_KAR: ["finansal sonuç","bilanço","faaliyet sonuç","net dönem kârı","net donem kari","kâr art","kar art","rekor","yüksek kâr","yuksek kar"],
  TEMETTU: ["temettü","kâr payı","kar payi","nakit temettü","kar dağıt","kâr dağıt"],
  GERI_ALIM: ["geri alım","pay geri alım","hisse geri alım","geri alim"],
  NEGATIF: ["zarar","ceza","inceleme","soruşturma","iptal","fesih","durdur","dava","iflas"],
  DIGER: [],
};

const BULLISH_TAGS: KapTag[] = ["IS_ANLASMASI","SATIN_ALMA","BIRLESME","YUKSEK_KAR","TEMETTU","GERI_ALIM"];

function detectKapTags(text: string): KapTag[] {
  const t = (text || "").toLowerCase();
  const tags: KapTag[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.length && keywords.some((k) => t.includes(k))) tags.push(tag as KapTag);
  }
  return tags.length ? tags : ["DIGER"];
}

// ✅ Stock code normalize: "AKBNK.E" -> "AKBNK", "AKBNK (BIST)" -> "AKBNK"
function normalizeCode(x: string) {
  const s = String(x || "")
    .toUpperCase()
    .replace(/\(.*?\)/g, "")      // parantez içi sil
    .replace(/[^A-Z0-9._-]/g, "") // garip karakterleri temizle
    .trim();
  if (!s) return "";
  // nokta sonrası uzantıyı kırp (AKBNK.E vs)
  return s.split(".")[0];
}

function extractCodes(stockCodes: any): string[] {
  const raw = String(stockCodes ?? "").toUpperCase();
  if (!raw) return [];
  return raw
    .split(/[\s,;|/]+/g)
    .map((x) => normalizeCode(x))
    .filter(Boolean);
}

function safeTimeMs(value: any): number {
  if (!value) return 0;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function ok(items: KapUIItem[], meta?: any) {
  return NextResponse.json(
    { ok: true, items, meta: meta ?? {} },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

function fail(error: string, meta?: any) {
  // UI patlamasın diye 200 + ok:false
  return NextResponse.json(
    { ok: false, error, items: [] as KapUIItem[], meta: meta ?? {} },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  // ✅ KAP bazen yavaş → ama 2.5s çok kısa, 7s daha sağlıklı
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 7000);

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

    const rawItems = await r.json();

    const since = Date.now() - 24 * 60 * 60 * 1000;

    const filtered = (Array.isArray(rawItems) ? rawItems : [])
      .map((it: any) => {
        const text = `${it.kapTitle ?? ""} ${it.summary ?? ""} ${it.disclosureClass ?? ""}`;
        const tags = detectKapTags(text);
        const codes = extractCodes(it.stockCodes);

        return { it, text, tags, codes, t: safeTimeMs(it.publishDate) };
      })
      .filter((x) => {
        if (!x.t || x.t < since) return false;

        // BIST100 match
        if (!x.codes.some((c) => BIST100.includes(c))) return false;

        // negatif filtre
        if (x.tags.includes("NEGATIF")) return false;

        // bullish
        return x.tags.some((tg) => BULLISH_TAGS.includes(tg));
      })
      .sort((a, b) => b.t - a.t)
      .slice(0, 30)
      .map((x) => {
        const it = x.it;
        const publishMs = x.t;
        // ✅ URL alanı KAP'ta farklı gelebilir; en güvenlisi link'i kontrol edip fallback ver
        const url =
          it?.disclosureLink ||
          it?.disclosureUrl ||
          it?.relatedLink ||
          (it?.disclosureIndex
            ? `https://www.kap.org.tr/tr/Bildirim/${it.disclosureIndex}`
            : "https://www.kap.org.tr/tr/");

        const out: KapUIItem = {
          title: String(it?.kapTitle ?? it?.title ?? "KAP Bildirimi"),
          url: String(url),
          source: "KAP",
          datetime: Math.floor(publishMs / 1000),
          company: (x.codes[0] ?? undefined),
          tags: x.tags,
          stockCodes: x.codes,
          raw: undefined, // debug istersen it koyabilirsin
        };
        return out;
      });

    // ✅ Haber yoksa da ok:true + items:[]
    return ok(filtered, { count: filtered.length, windowHours: 24 });
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "KAP timeout" : (e?.message ?? "KAP error");
    return fail(msg, { reason: e?.name === "AbortError" ? "TIMEOUT" : "FETCH_ERROR" });
  } finally {
    clearTimeout(timer);
  }
}