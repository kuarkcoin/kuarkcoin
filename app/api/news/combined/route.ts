// app/api/news/combined/route.ts
import { NextResponse } from "next/server";
import { scoreNews } from "@/lib/scoreNews";
import { NASDAQ300, ETFS, BIST100 as BIST100_UNIVERSE } from "@/constants/universe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================
// CONFIG
// =====================
type Mode = "raw" | "relaxed" | "strict";
const DEFAULT_MODE: Mode = "strict";

// BIST KAP API: kaç saatlik pencere
const WINDOW_HOURS = 72;
// KAP sorgusunda kaç gün geriye gidelim (72 saat için 3 gün mantıklı)
const QUERY_DAYS_BACK = 3;
// Timeout
const FETCH_TIMEOUT_MS = 12000;

// =====================
// TYPES
// =====================
type KapTag =
  | "IS_ANLASMASI"
  | "SATIN_ALMA"
  | "BIRLESME"
  | "YUKSEK_KAR"
  | "TEMETTU"
  | "GERI_ALIM"
  | "SERMAYE"
  | "BORCLANMA"
  | "ORTAKLIK"
  | "NEGATIF"
  | "DIGER";

type CombinedNewsItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number; // unix sec
  summary?: string;

  matched?: string[]; // e.g. ["AKBNK","THYAO"] or for US matched tickers
  score?: number; // 0..100
  level?: string; // LOW/MID/HIGH
  relevance?: number;

  // KAP-specific
  company?: string;
  tags?: KapTag[];
  stockCodes?: string[];
  meta?: Record<string, any>;
};

// =====================
// TAG KEYWORDS
// =====================
const TAG_KEYWORDS: Record<KapTag, string[]> = {
  IS_ANLASMASI: [
    "iş anlaşması","is anlasmasi","sözleşme","sozlesme","anlaşma","anlasma","ihale","sipariş","siparis","proje",
    "iş artışı","is artisi","kabul","teslim","yüklenici","alt yüklenici","alt yuklenici",
  ],
  SATIN_ALMA: ["satın alma","satin alma","devralma","edinim","pay devri","hisse devri","varlık devri","varlik devri"],
  BIRLESME: ["birleşme","birlesme","bölünme","bolunme","kısmi bölünme","kismi bolunme"],
  YUKSEK_KAR: [
    "finansal sonuç","finansal sonuc","bilanço","bilanco","net dönem kâr","net donem kar","kâr art","kar art",
    "rekor","yüksek kâr","yuksek kar","faaliyet karı","faaliyet kari","hasılat","hasilat","favök","fvaok","guidance",
  ],
  TEMETTU: ["temettü","temettu","kâr payı","kar payi","kar dağıt","kar dagit","kâr dağıt","dagitim teklifi"],
  GERI_ALIM: ["geri alım","geri alim","pay geri alım","pay geri alim","hisse geri alım","hisse geri alim","programı","programi"],
  SERMAYE: ["sermaye artırımı","sermaye artirimi","bedelli","bedelsiz","tavan","kayıtlı sermaye","kayitli sermaye","rüçhan","ruchan"],
  BORCLANMA: ["tahvil","bono","borçlanma","borclanma","eurobond","finansman","kredi anlaşması","kredi anlasmasi","sendikasyon"],
  ORTAKLIK: ["stratejik ortak","ortaklık","ortaklik","joint venture","iş birliği","is birligi","mutabakat","mou"],
  NEGATIF: [
    "zarar","ceza","inceleme","soruşturma","sorusturma","iptal","fesih","dava","iflas","tedbir","uyarı","uyari",
    "işlem sırası kapatma","islem sirasi kapatma","piyasa bozucu",
  ],
  DIGER: [],
};

const BULLISH_TAGS: KapTag[] = [
  "IS_ANLASMASI","SATIN_ALMA","BIRLESME","YUKSEK_KAR","TEMETTU","GERI_ALIM","SERMAYE","BORCLANMA","ORTAKLIK",
];

// =====================
// RESP HELPERS
// =====================
function ok(payload: any) {
  return NextResponse.json(payload, { status: 200, headers: { "Cache-Control": "no-store" } });
}

function clampInt(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function stripHtml(s: string) {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeUrl(u: any) {
  const s = String(u ?? "").trim();
  if (!s) return "https://www.kap.org.tr/tr/";
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `https://www.kap.org.tr${s}`;
  if (!/^https?:\/\//i.test(s)) return `https://www.kap.org.tr/${s.replace(/^\/+/, "")}`;
  return s;
}

// =====================
// UNIVERSE
// =====================
function pickUniverse(u: string): string[] {
  if (u === "NASDAQ300") return (NASDAQ300 ?? []).map((s) => String(s).toUpperCase());
  if (u === "ETFS") return (ETFS ?? []).map((s) => String(s).toUpperCase());
  return ((BIST100_UNIVERSE ?? []) as string[]).map((s) => String(s).toUpperCase());
}

// =====================
// KAP TAGS
// =====================
function detectKapTags(text: string): KapTag[] {
  const t = (text || "").toLowerCase();
  const tags: KapTag[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (!keywords.length) continue;
    if (keywords.some((k) => t.includes(k))) tags.push(tag as KapTag);
  }
  return tags.length ? tags : ["DIGER"];
}

// =====================
// STOCK CODE NORMALIZE (DIAMOND)
// =====================
function normalizeCode(x: string) {
  const s = String(x || "")
    .toUpperCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^A-Z0-9._-]/g, "")
    .trim();
  if (!s) return "";
  return s.split(".")[0];
}

/**
 * KAP bazen:
 *  - "AKBNK, THYAO"
 *  - ["AKBNK","THYAO"]
 *  - [{ code:"AKBNK" }, ...] gibi dönebiliyor.
 */
function extractCodesAny(stockCodes: any): string[] {
  if (!stockCodes) return [];

  // array
  if (Array.isArray(stockCodes)) {
    const flat = stockCodes
      .map((x) => {
        if (typeof x === "string") return x;
        if (x && typeof x === "object") return x.code ?? x.stockCode ?? x.symbol ?? "";
        return "";
      })
      .join(" ");
    return extractCodesString(flat);
  }

  // object
  if (typeof stockCodes === "object") {
    const maybe = stockCodes.code ?? stockCodes.stockCode ?? stockCodes.symbol ?? "";
    return extractCodesString(String(maybe));
  }

  // string/number
  return extractCodesString(String(stockCodes));
}

function extractCodesString(raw0: string): string[] {
  const raw = String(raw0 ?? "").toUpperCase();
  if (!raw) return [];
  return raw
    .split(/[\s,;|/]+/g)
    .map((x) => normalizeCode(x))
    .filter(Boolean);
}

// =====================
// TIME (TR safe)
// =====================
// TR = UTC+3 (DST yok)
function trLocalToUtcMs(yyyy: number, MM: number, dd: number, hh: number, mm: number) {
  return Date.UTC(yyyy, MM - 1, dd, hh - 3, mm, 0, 0);
}

// "Bugün 10:30", "Dün 17:44" gibi ifadeleri TR saatine göre UTC ms üret
function relTrToUtcMs(dayWord: string, hh: number, mm: number) {
  const nowUtc = Date.now();
  // UTC zamanını TR lokal gibi düşünmek için +3 saat ekleyip "TR günü" yakala
  const nowTr = new Date(nowUtc + 3 * 3600_000);
  const y = nowTr.getUTCFullYear();
  const M = nowTr.getUTCMonth() + 1;
  const d = nowTr.getUTCDate();
  const baseUtc = trLocalToUtcMs(y, M, d, hh, mm);
  const adj = dayWord.toLowerCase() === "dün" ? baseUtc - 24 * 3600_000 : baseUtc;
  return adj;
}

function safeTimeMsTR(value: any): number {
  if (value == null) return 0;

  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;

  const s = String(value).trim();
  if (!s) return 0;

  const mRel = s.match(/^(Bugün|Dün)\s+(\d{1,2}):(\d{2})$/i);
  if (mRel) {
    const [, dayWord, hh, mm] = mRel;
    return relTrToUtcMs(dayWord, Number(hh), Number(mm));
  }

  const mTR = s.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})\s+(\d{2}):(\d{2})$/);
  if (mTR) {
    const dd = Number(mTR[1]);
    const MM = Number(mTR[2]);
    let yyyy = Number(mTR[3]);
    if (yyyy < 100) yyyy = 2000 + yyyy;
    const hh = Number(mTR[4]);
    const mm = Number(mTR[5]);
    return trLocalToUtcMs(yyyy, MM, dd, hh, mm);
  }

  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

// =====================
// MATCHING (US/ETF)
// =====================
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchUniverse(news: CombinedNewsItem[], universeSymbols: string[]): CombinedNewsItem[] {
  if (!news.length || !universeSymbols.length) return [];

  const symSet = new Set(universeSymbols.map((s) => String(s).toUpperCase()));
  const regexCache = new Map<string, RegExp>();
  const out: CombinedNewsItem[] = [];

  for (const n of news) {
    const blob = `${n.headline} ${n.summary ?? ""}`.toUpperCase();
    const matched: string[] = [];

    for (const sym of symSet) {
      let re = regexCache.get(sym);
      if (!re) {
        re = new RegExp(`(^|[^A-Z0-9])${escapeRegex(sym)}([^A-Z0-9]|$)`, "i");
        regexCache.set(sym, re);
      }
      if (re.test(blob)) matched.push(sym);
      if (matched.length >= 6) break;
    }

    if (matched.length) out.push({ ...n, matched });
  }

  return out;
}

// =====================
// FETCHERS
// =====================
async function fetchFinnhubMarketNews(category: string): Promise<CombinedNewsItem[]> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return [];

  const url =
    `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}` +
    `&token=${encodeURIComponent(token)}`;

  const r = await fetch(url, { next: { revalidate: 120 } });
  if (!r.ok) return [];

  const data = (await r.json()) as any[];
  return (Array.isArray(data) ? data : [])
    .filter((x) => x?.headline && x?.url)
    .map((x) => ({
      headline: String(x.headline),
      url: String(x.url),
      source: String(x.source ?? "Finnhub"),
      datetime: Number(x.datetime ?? 0),
      summary: String(x.summary ?? ""),
    }))
    .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
}

// KAP API (memberDisclosureQuery)
async function fetchKapApi(mode: Mode, universeBistSymbols: string[]) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  const toDate = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - QUERY_DAYS_BACK * 86400000).toISOString().slice(0, 10);

  try {
    const body = { fromDate, toDate, subjectList: [], bdkMemberOidList: [] };

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

    const since = Date.now() - WINDOW_HOURS * 3600_000;
    const uniSet = new Set(universeBistSymbols.map((x) => String(x).toUpperCase()));

    const normalized = arr.map((it: any) => {
      const title = String(it?.kapTitle ?? it?.title ?? "KAP Bildirimi");
      const summary = it?.summary ? stripHtml(String(it.summary)).slice(0, 360) : "";

      const text = `${title} ${summary} ${it?.disclosureClass ?? ""}`;
      const tags = detectKapTags(text);

      const codes = extractCodesAny(it.stockCodes ?? it.relatedStockCodes ?? it.companyStocks ?? it.stocks ?? it.stockCode);

      const t = safeTimeMsTR(it.publishDate);

      const url =
        it?.disclosureLink ||
        it?.disclosureUrl ||
        it?.relatedLink ||
        (it?.disclosureIndex
          ? `https://www.kap.org.tr/tr/Bildirim/${encodeURIComponent(String(it.disclosureIndex))}`
          : "");

      const ui: CombinedNewsItem = {
        headline: title,
        url: normalizeUrl(url),
        source: "KAP",
        datetime: Math.floor((t || 0) / 1000),
        summary,
        tags,
        stockCodes: codes,
        company: codes[0] ?? undefined,
        matched: codes.length ? codes.slice(0, 6) : undefined,
        meta: {
          disclosureIndex: it?.disclosureIndex ?? null,
          publishDate: it?.publishDate ?? null,
          disclosureClass: it?.disclosureClass ?? null,
        },
      };

      return { it, tags, codes, t, ui };
    });

    if (mode === "raw") {
      const items = normalized
        .sort((a, b) => (b.t || 0) - (a.t || 0))
        .slice(0, 40)
        .map((x) => x.ui);

      return {
        items,
        meta: {
          mode,
          rawCount: arr.length,
          normalizedCount: normalized.length,
          dateRange: { fromDate, toDate },
          sample: {
            publishDate: arr?.[0]?.publishDate ?? null,
            stockCodes: arr?.[0]?.stockCodes ?? null,
            relatedStockCodes: arr?.[0]?.relatedStockCodes ?? null,
            kapTitle: arr?.[0]?.kapTitle ?? null,
          },
        },
      };
    }

    // window filter
    let filtered = normalized.filter((x) => x.t && x.t >= since);

    if (mode === "relaxed") {
      const items = filtered
        .sort((a, b) => (b.t || 0) - (a.t || 0))
        .slice(0, 120)
        .map((x) => x.ui);
      return {
        items,
        meta: {
          mode,
          rawCount: arr.length,
          afterWindow: filtered.length,
          windowHours: WINDOW_HOURS,
          dateRange: { fromDate, toDate },
        },
      };
    }

    // strict
    const debug = { rawCount: arr.length, afterWindow: filtered.length, noCodes: 0, notInUniverse: 0, hasNegative: 0, notBullishOrOther: 0 };

    filtered = filtered.filter((x) => {
      if (!x.codes.length) {
        debug.noCodes++;
        return false;
      }
      const inUni = x.codes.some((c) => uniSet.has(c));
      if (!inUni) {
        debug.notInUniverse++;
        return false;
      }
      if (x.tags.includes("NEGATIF")) {
        debug.hasNegative++;
        return false;
      }
      const okTag = x.tags.some((tg) => BULLISH_TAGS.includes(tg)) || x.tags.includes("DIGER");
      if (!okTag) {
        debug.notBullishOrOther++;
        return false;
      }
      return true;
    });

    const items = filtered
      .sort((a, b) => (b.t || 0) - (a.t || 0))
      .slice(0, 120)
      .map((x) => x.ui);

    return {
      items,
      meta: {
        mode,
        ...debug,
        afterStrict: filtered.length,
        windowHours: WINDOW_HOURS,
        dateRange: { fromDate, toDate },
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchExternalNews(u: string, mode: Mode, universeSymbols: string[]) {
  if (u === "BIST100") {
    return fetchKapApi(mode, universeSymbols);
  }

  const finnhub = await fetchFinnhubMarketNews("general");
  const matched = matchUniverse(finnhub, universeSymbols);

  return {
    items: matched,
    meta: {
      mode,
      totalRaw: finnhub.length,
      totalMatched: matched.length,
      source: "Finnhub market-news general",
    },
  };
}

// =====================
// ROUTE
// =====================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const u = (searchParams.get("u") || "BIST100").toUpperCase();
    const mode = ((searchParams.get("mode") as Mode) || DEFAULT_MODE) as Mode;

    const limit = clampInt(searchParams.get("limit"), 12, 1, 80);
    const minScore = clampInt(searchParams.get("minScore"), 60, 0, 100);

    // Optional: US-side fallback (default OFF)
    const allowFallback = searchParams.get("fallback") === "1";

    const universe = pickUniverse(u);
    const { items: rawItems0, meta } = await fetchExternalNews(u, mode, universe);

    // If US-side matched empty + fallback ON => show raw news (matched empty)
    const rawItems =
      allowFallback && u !== "BIST100" && rawItems0.length === 0
        ? (await fetchFinnhubMarketNews("general")).slice(0, Math.max(limit * 2, 24)).map((x) => ({ ...x, matched: [] }))
        : rawItems0;

    // Diamond: KAP strict modda DIGER'i tamamen öldürme -> minScore yumuşat
    const effectiveMinScore =
      u === "BIST100" && mode === "strict" ? Math.min(minScore, 55) : minScore;

    const scored = rawItems
      .map((n) => {
        const r = scoreNews(n);
        return { ...n, score: r.score, level: r.level };
      })
      .filter((n) => (n.score ?? 0) >= effectiveMinScore)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);

    return ok({
      ok: true,
      universe: u,
      mode,
      minScore: effectiveMinScore,
      limit,
      totalRaw: rawItems.length,
      items: scored,
      meta,
    });
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "timeout" : (e?.message ?? "news failed");
    return ok({ ok: false, error: msg, items: [] });
  }
}