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

// ✅ Debug / filtre kontrolü
const DEBUG_META = false;          // true => meta içine rawCount + sample koyar
const REQUIRE_BULLISH_ONLY = true; // true => sadece bullish tag'ler
const EXCLUDE_NEGATIVE = true;     // true => NEGATIF tag'li olanları dışla

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
  IS_ANLASMASI: [
    "iş anlaşması","sözleşme imzalan","sözleşme","anlaşma sağlan","ihale kazan","ihale",
    "proje sözleşmesi","sipariş al","sipariş","yeni sipariş"
  ],
  SATIN_ALMA: ["satın alma","pay devri","hisse devri","devralma","iştirak edinimi","edinim"],
  BIRLESME: ["birleşme","birleşme işlemi","kolaylaştırılmış birleşme","bölünme","kısmi bölünme"],
  YUKSEK_KAR: [
    "finansal sonuç","bilanço","faaliyet sonuç","net dönem kârı","net donem kari",
    "kâr art","kar art","rekor","yüksek kâr","yuksek kar"
  ],
  TEMETTU: ["temettü","kâr payı","kar payi","nakit temettü","kar dağıt","kâr dağıt"],
  GERI_ALIM: ["geri alım","pay geri alım","hisse geri alım","geri alim"],
  NEGATIF: ["zarar","ceza","inceleme","soruşturma","iptal","fesih","durdur","dava","iflas"],
  DIGER: [],
};

const BULLISH_TAGS: KapTag[] = [
  "IS_ANLASMASI","SATIN_ALMA","BIRLESME","YUKSEK_KAR","TEMETTU","GERI_ALIM"
];

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
    .replace(/\(.*?\)/g, "")
    .replace(/[^A-Z0-9._-]/g, "")
    .trim();
  if (!s) return "";
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

/**
 * ✅ KAP publishDate bazen:
 * - "Bugün 10:30"
 * - "Dün 17:44"
 * - "14.07.2025 18:14" / "14.07.25 18:14"
 * - unix (sec/ms)
 */
function safeTimeMsTR(value: any): number {
  if (value == null) return 0;

  // unix number
  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }

  const s = String(value).trim();
  if (!s) return 0;

  // Bugün/Dün HH:mm
  const mRel = s.match(/^(Bugün|Dün)\s+(\d{1,2}):(\d{2})$/i);
  if (mRel) {
    const [, dayWord, hh, mm] = mRel;
    const d = new Date();
    d.setHours(Number(hh), Number(mm), 0, 0);
    if (dayWord.toLowerCase() === "dün") d.setDate(d.getDate() - 1);
    return d.getTime();
  }

  // dd.MM.yy(yy) HH:mm
  const mTR = s.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})\s+(\d{2}):(\d{2})$/);
  if (mTR) {
    const dd = Number(mTR[1]);
    const MM = Number(mTR[2]);
    let yyyy = Number(mTR[3]);
    if (yyyy < 100) yyyy = 2000 + yyyy;
    const hh = Number(mTR[4]);
    const mm = Number(mTR[5]);
    return new Date(yyyy, MM - 1, dd, hh, mm, 0, 0).getTime();
  }

  // ISO fallback
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function ok(items: KapUIItem[], meta?: any) {
  return NextResponse.json(
    { ok: true, items, meta: meta ?? {} },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

function fail(error: string, meta?: any) {
  return NextResponse.json(
    { ok: false, error, items: [] as KapUIItem[], meta: meta ?? {} },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 9000); // ✅ 9s daha güvenli

  try {
    // (Opsiyonel) dün-bugün aralığı — KAP bazen boş tarih sevmez
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const r = await fetch("https://www.kap.org.tr/tr/api/memberDisclosureQuery", {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        fromDate: yesterday,      // ✅ boş yerine tarih ver
        toDate: today,            // ✅
        subjectList: [],
        bdkMemberOidList: [],
        srcCategory: "",          // ✅ debug için genişlet (istersen "4" yaparsın)
      }),
      cache: "no-store",
      signal: ac.signal,
    });

    if (!r.ok) throw new Error(`KAP API error: ${r.status}`);

    const rawItems = await r.json();
    const arr = Array.isArray(rawItems) ? rawItems : [];

    // Debug meta (tek bakış)
    if (DEBUG_META) {
      return ok([], {
        rawCount: arr.length,
        samplePublishDate: arr?.[0]?.publishDate ?? null,
        sampleStockCodes: arr?.[0]?.stockCodes ?? null,
        sampleTitle: arr?.[0]?.kapTitle ?? null,
      });
    }

    const since = Date.now() - 24 * 60 * 60 * 1000;

    const filtered = arr
      .map((it: any) => {
        const text = `${it.kapTitle ?? ""} ${it.summary ?? ""} ${it.disclosureClass ?? ""}`;
        const tags = detectKapTags(text);
        const codes = extractCodes(it.stockCodes);
        const t = safeTimeMsTR(it.publishDate);
        return { it, text, tags, codes, t };
      })
      .filter((x) => {
        if (!x.t || x.t < since) return false;

        // BIST100 match
        if (!x.codes.some((c) => BIST100.includes(c))) return false;

        // negatif filtre
        if (EXCLUDE_NEGATIVE && x.tags.includes("NEGATIF")) return false;

        // bullish only (istersen kapat)
        if (REQUIRE_BULLISH_ONLY) {
          return x.tags.some((tg) => BULLISH_TAGS.includes(tg));
        }

        return true;
      })
      .sort((a, b) => b.t - a.t)
      .slice(0, 30)
      .map((x) => {
        const it = x.it;
        const publishMs = x.t;

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
          company: x.codes[0] ?? undefined,
          tags: x.tags,
          stockCodes: x.codes,
          raw: undefined,
        };
        return out;
      });

    return ok(filtered, { count: filtered.length, windowHours: 24 });
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "KAP timeout" : (e?.message ?? "KAP error");
    return fail(msg, { reason: e?.name === "AbortError" ? "TIMEOUT" : "FETCH_ERROR" });
  } finally {
    clearTimeout(timer);
  }
}
