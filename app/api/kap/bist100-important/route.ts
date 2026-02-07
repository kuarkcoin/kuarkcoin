import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================
// CONFIG
// =====================
type Mode = "raw" | "relaxed" | "strict";

const DEFAULT_MODE: Mode = "relaxed";
const WINDOW_HOURS = 72; // son 72 saat

// KAP sorgusunda kaç gün geriye gidelim (72 saat için 3 gün mantıklı)
const QUERY_DAYS_BACK = 3;

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
};

const TAG_KEYWORDS: Record<KapTag, string[]> = {
  IS_ANLASMASI: ["iş anlaşması","sözleşme","anlaşma","ihale","sipariş","proje"],
  SATIN_ALMA: ["satın alma","devralma","edinim","pay devri","hisse devri"],
  BIRLESME: ["birleşme","bölünme","kısmi bölünme"],
  YUKSEK_KAR: ["finansal sonuç","bilanço","net dönem kâr","kâr art","rekor","yüksek kâr"],
  TEMETTU: ["temettü","kâr payı","kar payi","kar dağıt","kâr dağıt"],
  GERI_ALIM: ["geri alım","pay geri alım","hisse geri alım"],
  NEGATIF: ["zarar","ceza","inceleme","soruşturma","iptal","fesih","dava","iflas"],
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
 * KAP publishDate bazen TR:
 *  "Bugün 10:30", "Dün 17:44", "14.07.2025 18:14"
 * bazen unix, bazen ISO.
 */
function safeTimeMsTR(value: any): number {
  if (value == null) return 0;

  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }

  const s = String(value).trim();
  if (!s) return 0;

  const mRel = s.match(/^(Bugün|Dün)\s+(\d{1,2}):(\d{2})$/i);
  if (mRel) {
    const [, dayWord, hh, mm] = mRel;
    const d = new Date();
    d.setHours(Number(hh), Number(mm), 0, 0);
    if (dayWord.toLowerCase() === "dün") d.setDate(d.getDate() - 1);
    return d.getTime();
  }

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

  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function ok(payload: any) {
  return NextResponse.json(payload, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

function fail(error: string, meta?: any) {
  return ok({ ok: false, error, items: [], meta: meta ?? {} });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") as Mode) || DEFAULT_MODE;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);

  try {
    const toDate = new Date().toISOString().slice(0, 10);
    const fromDate = new Date(Date.now() - QUERY_DAYS_BACK * 86400000)
      .toISOString()
      .slice(0, 10);

    // srcCategory YOK -> toleranslı
    const body = {
      fromDate,
      toDate,
      subjectList: [],
      bdkMemberOidList: [],
    };

    const r = await fetch("https://www.kap.org.tr/tr/api/memberDisclosureQuery", {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: ac.signal,
    });

    if (!r.ok) throw new Error(`KAP API error: ${r.status}`);

    const raw = await r.json();
    const arr = Array.isArray(raw) ? raw : [];

    const since = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;

    const normalized = arr.map((it: any) => {
      const text = `${it.kapTitle ?? ""} ${it.summary ?? ""} ${it.disclosureClass ?? ""}`;
      const tags = detectKapTags(text);
      const codes = extractCodes(it.stockCodes);
      const t = safeTimeMsTR(it.publishDate);

      const url =
        it?.disclosureLink ||
        it?.disclosureUrl ||
        it?.relatedLink ||
        (it?.disclosureIndex
          ? `https://www.kap.org.tr/tr/Bildirim/${encodeURIComponent(String(it.disclosureIndex))}`
          : "https://www.kap.org.tr/tr/");

      return {
        it,
        text,
        tags,
        codes,
        t,
        ui: {
          title: String(it?.kapTitle ?? it?.title ?? "KAP Bildirimi"),
          url: String(url),
          source: "KAP",
          datetime: Math.floor((t || 0) / 1000),
          company: codes[0] ?? undefined,
          tags,
          stockCodes: codes,
        } as KapUIItem,
      };
    });

    // RAW: API geliyor mu?
    if (mode === "raw") {
      return ok({
        ok: true,
        mode,
        items: normalized
          .sort((a, b) => (b.t || 0) - (a.t || 0))
          .slice(0, 20)
          .map((x) => x.ui),
        meta: {
          rawCount: arr.length,
          normalizedCount: normalized.length,
          dateRange: { fromDate, toDate },
          sample: {
            publishDate: arr?.[0]?.publishDate ?? null,
            stockCodes: arr?.[0]?.stockCodes ?? null,
            kapTitle: arr?.[0]?.kapTitle ?? null,
          },
        },
      });
    }

    // window filter
    let filtered = normalized.filter((x) => x.t && x.t >= since);

    if (mode === "relaxed") {
      const items = filtered
        .sort((a, b) => (b.t || 0) - (a.t || 0))
        .slice(0, 30)
        .map((x) => x.ui);

      return ok({
        ok: true,
        mode,
        items,
        meta: {
          rawCount: arr.length,
          afterWindow: filtered.length,
          windowHours: WINDOW_HOURS,
          dateRange: { fromDate, toDate },
        },
      });
    }

    // strict
    const beforeStrict = filtered.length;

    const strictFiltered = filtered
      .filter((x) => x.codes.some((c) => BIST100.includes(c)))
      .filter((x) => !x.tags.includes("NEGATIF"))
      .filter((x) => x.tags.some((tg) => BULLISH_TAGS.includes(tg)));

    const items = strictFiltered
      .sort((a, b) => (b.t || 0) - (a.t || 0))
      .slice(0, 30)
      .map((x) => x.ui);

    if (items.length === 0 && filtered.length > 0) {
      const relaxedItems = filtered
        .sort((a, b) => (b.t || 0) - (a.t || 0))
        .slice(0, 30)
        .map((x) => x.ui);

      return ok({
        ok: true,
        mode,
        items: relaxedItems,
        meta: {
          rawCount: arr.length,
          afterWindow: beforeStrict,
          afterStrict: strictFiltered.length,
          windowHours: WINDOW_HOURS,
          dateRange: { fromDate, toDate },
          fallback: "relaxed",
        },
      });
    }

    return ok({
      ok: true,
      mode,
      items,
      meta: {
        rawCount: arr.length,
        afterWindow: beforeStrict,
        afterStrict: strictFiltered.length,
        windowHours: WINDOW_HOURS,
        dateRange: { fromDate, toDate },
      },
    });
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "KAP timeout" : (e?.message ?? "KAP error");
    return fail(msg, { reason: e?.name === "AbortError" ? "TIMEOUT" : "FETCH_ERROR" });
  } finally {
    clearTimeout(timer);
  }
}
