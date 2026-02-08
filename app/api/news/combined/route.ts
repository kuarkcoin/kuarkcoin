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

const WINDOW_HOURS = 72;
const QUERY_DAYS_BACK = 3;
const FETCH_TIMEOUT_MS = 12_000;

// ✅ Critical Fix: meta union olmasın
type FetchMeta = Record<string, any>;
type FetchResult = { items: CombinedNewsItem[]; meta: FetchMeta };

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

  matched?: string[];
  score?: number;
  level?: string;

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
    "iş anlaşması",
    "is anlasmasi",
    "sözleşme",
    "sozlesme",
    "anlaşma",
    "anlasma",
    "ihale",
    "sipariş",
    "siparis",
    "proje",
    "iş artışı",
    "is artisi",
    "kabul",
    "teslim",
    "yüklenici",
    "alt yüklenici",
    "alt yuklenici",
  ],
  SATIN_ALMA: ["satın alma", "satin alma", "devralma", "edinim", "pay devri", "hisse devri", "varlık devri"],
  BIRLESME: ["birleşme", "birlesme", "bölünme", "bolunme", "kısmi bölünme", "kismi bolunme"],
  YUKSEK_KAR: [
    "finansal sonuç",
    "finansal sonuc",
    "bilanço",
    "bilanco",
    "net dönem kâr",
    "net donem kar",
    "kâr art",
    "kar art",
    "rekor",
    "yüksek kâr",
    "yuksek kar",
    "faaliyet karı",
    "faaliyet kari",
    "hasılat",
    "hasilat",
    "favök",
    "fvaok",
    "guidance",
  ],
  TEMETTU: ["temettü", "temettu", "kâr payı", "kar payi", "kar dağıt", "kar dagit", "kâr dağıt", "dagitim teklifi"],
  GERI_ALIM: ["geri alım", "geri alim", "pay geri alım", "pay geri alim", "hisse geri alım", "hisse geri alim", "program"],
  SERMAYE: [
    "sermaye artırımı",
    "sermaye artirimi",
    "bedelli",
    "bedelsiz",
    "tavan",
    "kayıtlı sermaye",
    "kayitli sermaye",
    "rüçhan",
    "ruchan",
    "hak kullanımı",
    "hak kullanimi",
  ],
  BORCLANMA: ["tahvil", "bono", "borçlanma", "borclanma", "eurobond", "finansman", "kredi anlaşması", "kredi anlasmasi"],
  ORTAKLIK: ["stratejik ortak", "ortaklık", "ortaklik", "joint venture", "iş birliği", "is birligi", "mutabakat", "mou"],
  NEGATIF: [
    "zarar",
    "ceza",
    "inceleme",
    "soruşturma",
    "sorusturma",
    "iptal",
    "fesih",
    "dava",
    "iflas",
    "tedbir",
    "uyarı",
    "uyari",
    "işlem sırası kapatma",
    "islem sirasi kapatma",
    "piyasa bozucu",
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
  "SERMAYE",
  "BORCLANMA",
  "ORTAKLIK",
];

// =====================
// HELPERS
// =====================
function ok(payload: any) {
  return NextResponse.json(payload, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
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
  if (!/^https?:\/\//i.test(s)) return `https://www.kap.org.tr${s.startsWith("tr/") ? "/" : "/"}${s}`;
  return s;
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
// TIME PARSING (TR-safe)
// =====================
function getIstanbulParts(d: Date) {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return {
    yyyy: Number(get("year")),
    MM: Number(get("month")),
    dd: Number(get("day")),
    hh: Number(get("hour")),
    mm: Number(get("minute")),
  };
}

// Istanbul is UTC+3
function istanbulLocalToUtcMs(yyyy: number, MM: number, dd: number, hh: number, mm: number) {
  return Date.UTC(yyyy, MM - 1, dd, hh - 3, mm, 0, 0);
}

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

    const nowParts = getIstanbulParts(new Date());
    let { yyyy, MM, dd } = nowParts;

    if (dayWord.toLowerCase() === "dün") {
      const todayUtcMs = istanbulLocalToUtcMs(yyyy, MM, dd, 12, 0);
      const yUtc = new Date(todayUtcMs - 86400000);
      const yParts = getIstanbulParts(yUtc);
      yyyy = yParts.yyyy;
      MM = yParts.MM;
      dd = yParts.dd;
    }

    return istanbulLocalToUtcMs(yyyy, MM, dd, Number(hh), Number(mm));
  }

  const mTR = s.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})\s+(\d{2}):(\d{2})$/);
  if (mTR) {
    const dd = Number(mTR[1]);
    const MM = Number(mTR[2]);
    let yyyy = Number(mTR[3]);
    if (yyyy < 100) yyyy = 2000 + yyyy;
    const hh = Number(mTR[4]);
    const mm = Number(mTR[5]);
    return istanbulLocalToUtcMs(yyyy, MM, dd, hh, mm);
  }

  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

// =====================
// UNIVERSE + MATCH
// =====================
function pickUniverse(u: string): string[] {
  if (u === "NASDAQ300") return (NASDAQ300 ?? []).map((s) => String(s).toUpperCase());
  if (u === "ETFS") return (ETFS ?? []).map((s) => String(s).toUpperCase());
  return ((BIST100_UNIVERSE ?? []) as string[]).map((s) => String(s).toUpperCase());
}

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

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  try {
    const r = await fetch(url, { next: { revalidate: 120 }, signal: ac.signal });
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
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchKapApi(mode: Mode, universeBistSymbols: string[], debugOn: boolean): Promise<FetchResult> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  const toDate = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - QUERY_DAYS_BACK * 86400000).toISOString().slice(0, 10);

  const uniSet = new Set(universeBistSymbols.map((x) => String(x).toUpperCase()));
  const since = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;

  const debug: FetchMeta = {
    mode,
    rawCount: 0,
    normalizedCount: 0,
    afterWindow: 0,
    afterStrict: 0,
    windowHours: WINDOW_HOURS,
    dateRange: { fromDate, toDate },
    noCodes: 0,
    notInUniverse: 0,
    hasNegative: 0,
    notBullishOrOther: 0,
    sample: {},
  };

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

    debug.rawCount = arr.length;
    debug.sample = debugOn
      ? {
          publishDate: arr?.[0]?.publishDate ?? null,
          stockCodes: arr?.[0]?.stockCodes ?? null,
          relatedStockCodes: arr?.[0]?.relatedStockCodes ?? null,
          kapTitle: arr?.[0]?.kapTitle ?? null,
          disclosureIndex: arr?.[0]?.disclosureIndex ?? null,
        }
      : {};

    const normalized = arr.map((it: any) => {
      const headline = String(it?.kapTitle ?? it?.title ?? "KAP Bildirimi");
      const summary = it?.summary ? stripHtml(String(it.summary)).slice(0, 320) : "";

      const text = `${headline} ${summary} ${it?.disclosureClass ?? ""}`;
      const tags = detectKapTags(text);

      const codes = extractCodes(it.stockCodes || it.relatedStockCodes || it.companyStocks || it?.stockCode || "");
      const t = safeTimeMsTR(it.publishDate);

      const url =
        it?.disclosureLink ||
        it?.disclosureUrl ||
        it?.relatedLink ||
        (it?.disclosureIndex ? `https://www.kap.org.tr/tr/Bildirim/${encodeURIComponent(String(it.disclosureIndex))}` : "");

      const ui: CombinedNewsItem = {
        headline,
        url: normalizeUrl(url),
        source: "KAP",
        datetime: Math.floor((t || 0) / 1000),
        summary,
        company: codes[0] ?? undefined,
        tags,
        stockCodes: codes,
        matched: codes.length ? codes.slice(0, 6) : undefined,
        meta: debugOn ? { disclosureIndex: it?.disclosureIndex ?? null, publishDateRaw: it?.publishDate ?? null } : undefined,
      };

      return { it, t, codes, tags, ui };
    });

    debug.normalizedCount = normalized.length;

    if (mode === "raw") {
      const items = normalized
        .sort((a, b) => (b.t || 0) - (a.t || 0))
        .slice(0, 80)
        .map((x) => x.ui);

      return { items, meta: debugOn ? debug : { mode, rawCount: debug.rawCount } };
    }

    let filtered = normalized.filter((x) => x.t && x.t >= since);
    debug.afterWindow = filtered.length;

    if (mode === "relaxed") {
      const items = filtered
        .sort((a, b) => (b.t || 0) - (a.t || 0))
        .slice(0, 120)
        .map((x) => x.ui);

      return { items, meta: debugOn ? debug : { mode, rawCount: debug.rawCount, afterWindow: debug.afterWindow } };
    }

    // strict
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

    debug.afterStrict = filtered.length;

    const items = filtered
      .sort((a, b) => (b.t || 0) - (a.t || 0))
      .slice(0, 120)
      .map((x) => x.ui);

    return {
      items,
      meta: debugOn
        ? debug
        : { mode, rawCount: debug.rawCount, afterWindow: debug.afterWindow, afterStrict: debug.afterStrict },
    };
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "KAP timeout" : (e?.message ?? "KAP error");
    return { items: [], meta: debugOn ? { ...debug, error: msg } : { mode, error: msg } };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchExternalNews(u: string, mode: Mode, universeSymbols: string[], debugOn: boolean): Promise<FetchResult> {
  if (u === "BIST100") {
    return fetchKapApi(mode, universeSymbols, debugOn);
  }

  const finnhub = await fetchFinnhubMarketNews("general");
  const matched = matchUniverse(finnhub, universeSymbols);

  return {
    items: matched,
    meta: debugOn
      ? { mode, totalRaw: finnhub.length, totalMatched: matched.length, source: "Finnhub market-news general" }
      : { mode, totalRaw: finnhub.length, totalMatched: matched.length },
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

    const debugOn = searchParams.get("debug") === "1";
    const allowFallback = searchParams.get("fallback") !== "0";

    const universe = pickUniverse(u);

    // ✅ explicit meta type: no union, no build error
    let rawItems: CombinedNewsItem[] = [];
    let meta: FetchMeta = {};

    // 1) fetch
    const main = await fetchExternalNews(u, mode, universe, debugOn);
    rawItems = main.items;
    meta = main.meta;

    // 2) BIST strict => fallback to relaxed if empty
    if (u === "BIST100" && allowFallback && mode === "strict" && rawItems.length === 0) {
      const fb = await fetchExternalNews(u, "relaxed", universe, debugOn);
      rawItems = fb.items;
      meta = debugOn
        ? { ...(meta || {}), fallbackTo: "relaxed", fallbackMeta: fb.meta }
        : { ...(meta || {}), fallbackTo: "relaxed" };
    }

    // 3) Score + filter + sort
    const scored = rawItems
      .map((n) => {
        const r = scoreNews(n);
        return { ...n, score: r.score, level: r.level };
      })
      .filter((n) => (n.score ?? 0) >= minScore)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);

    return ok({
      ok: true,
      universe: u,
      mode,
      minScore,
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
