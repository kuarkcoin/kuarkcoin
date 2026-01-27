import { NextResponse } from "next/server";

export const runtime = "nodejs";
// ✅ Route çıktısı günde 1 kez yenilensin
export const revalidate = 86400;

type Row = {
  symbol: string;        // AAPL | BIMAS
  finnhubSymbol: string; // AAPL | BIMAS.IS
  grossMargin: number | null; // TTM %
  netMargin: number | null;   // TTM %
  period: "TTM" | "FY" | "UNKNOWN";

  // ✅ trend için (son 4 çeyrek)
  grossSeries?: number[]; // %
  netSeries?: number[];   // %
  qualityScore?: number;  // hesaplanan skor
  volatility?: number;    // serinin stddev'i (düşük=iyi)
};

// --------------------
// UNIVERSE LISTS
// --------------------
const BIST100 = [
  "AKBNK","ALARK","ARCLK","ASELS","BIMAS","BRYAT","CIMSA","DOAS","EKGYO",
  "ENJSA","EREGL","FROTO","GARAN","GUBRF","HALKB","HEKTS","ISCTR","KCHOL",
  "KOZAA","KOZAL","KRDMD","MGROS","PETKM","SAHOL","SISE","TCELL","THYAO",
  "TOASO","TTKOM","TUPRS","YKBNK",
  // ... kalanları ekle
];

const NASDAQ100 = [
  "AAPL","MSFT","NVDA","AMZN","META","GOOG","GOOGL","TSLA","NFLX","ADBE",
  "AMD","INTU","PEP","QCOM","AMGN","ADI","CSCO","TMUS","REGN","VRTX",
  "SNPS","CDNS","PANW","CRWD","MU","LRCX","KLAC","ASML","AVGO","TXN",
  // ... NASDAQ100'ü tamamla
];

// --------------------
// HELPERS
// --------------------
function num(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function mean(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
}
function stddev(xs: number[]) {
  if (xs.length <= 1) return 0;
  const m = mean(xs);
  const v = mean(xs.map(x => (x - m) ** 2));
  return Math.sqrt(v);
}
function slope(xs: number[]) {
  // basit eğim: son - ilk
  if (xs.length < 2) return 0;
  return xs[xs.length - 1] - xs[0];
}

function toFinnhubSymbol(sym: string, universe: string) {
  const s = String(sym || "").trim();
  if (!s) return s;
  if (s.includes(".")) return s;
  return universe === "BIST100" ? `${s}.IS` : s;
}

// --------------------
// FINNHUB CALLS
// --------------------
async function finnhubMetricCached(symbol: string) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) throw new Error("Missing FINNHUB_API_KEY");

  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
    symbol
  )}&metric=all&token=${encodeURIComponent(token)}`;

  // /stock/metric (TTM marjları) 2
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Finnhub metric ${res.status}`);
  return res.json();
}

async function finnhubFinancialsReportedQuarterlyCached(symbol: string) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) throw new Error("Missing FINNHUB_API_KEY");

  // financials-reported freq=quarterly 3
  const url =
    `https://finnhub.io/api/v1/stock/financials-reported?symbol=${encodeURIComponent(symbol)}` +
    `&freq=quarterly&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Finnhub financials-reported ${res.status}`);
  return res.json();
}

// simple concurrency limiter
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

// --------------------
// QUARTER SERIES PARSER
// --------------------
function pickVal(items: any[], keys: string[]): number | null {
  // Finnhub "report" yapısında kalem isimleri değişebiliyor.
  // En sık karşılaşılan isimlere göre esnek arıyoruz.
  for (const k of keys) {
    const hit = items?.find((x: any) => String(x?.concept || x?.label || x?.name || "").toLowerCase() === k.toLowerCase());
    const v = num(hit?.value ?? hit?.val ?? hit?.amount);
    if (v != null) return v;
  }
  // fallback: concept içeriyor mu?
  for (const k of keys) {
    const hit = items?.find((x: any) => String(x?.concept || "").toLowerCase().includes(k.toLowerCase()));
    const v = num(hit?.value ?? hit?.val ?? hit?.amount);
    if (v != null) return v;
  }
  return null;
}

function computeMarginsFromQuarterly(fin: any): { grossSeries: number[]; netSeries: number[] } | null {
  const data = fin?.data;
  if (!Array.isArray(data) || data.length === 0) return null;

  // en yeni -> eski sıralı geliyorsa ters; emin değiliz: tarih alanına göre sıralayalım
  const sorted = [...data].sort((a, b) => String(a?.endDate ?? a?.year ?? "").localeCompare(String(b?.endDate ?? b?.year ?? "")));

  // son 4 çeyrek
  const last4 = sorted.slice(-4);

  const grossSeries: number[] = [];
  const netSeries: number[] = [];

  for (const q of last4) {
    // rapor kalemleri genelde burada
    const items =
      q?.report?.ic ??              // income statement
      q?.report?.bs ??              // bazen farklı
      q?.report?.cf ??              // irrelevant ama fallback
      q?.report?.data ??
      q?.report ??
      [];

    const revenue = pickVal(items, ["Revenue", "Revenues", "TotalRevenue", "NetSales", "SalesRevenueNet"]);
    const grossProfit = pickVal(items, ["GrossProfit", "Gross Profit"]);
    const netIncome = pickVal(items, ["NetIncomeLoss", "NetIncome", "ProfitLoss"]);

    if (revenue && revenue !== 0) {
      if (grossProfit != null) grossSeries.push((grossProfit / revenue) * 100);
      if (netIncome != null) netSeries.push((netIncome / revenue) * 100);
    }
  }

  if (grossSeries.length < 2 && netSeries.length < 2) return null;
  return { grossSeries, netSeries };
}

// --------------------
// ROUTE
// --------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const universe = (searchParams.get("universe") || "BIST100").toUpperCase();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);

    const list = universe === "NASDAQ100" ? NASDAQ100 : BIST100;
    if (!list.length) {
      return NextResponse.json({ data: { universe, topNet: [], topGross: [], topQuality: [] } }, { status: 200 });
    }

    // 1) TTM marjları hızlıca çek
    const baseRows = await mapLimit(list, 8, async (sym) => {
      const finSym = toFinnhubSymbol(sym, universe);
      try {
        const j = await finnhubMetricCached(finSym);
        const m = j?.metric ?? {};

        const gross =
          num(m.grossMarginTTM) ??
          num(m.grossMarginAnnual) ??
          num(m.grossMargin) ??
          null;

        const net =
          num(m.netMarginTTM) ??
          num(m.netMarginAnnual) ??
          num(m.netMargin) ??
          null;

        const period: Row["period"] =
          num(m.grossMarginTTM) != null || num(m.netMarginTTM) != null ? "TTM"
          : num(m.grossMarginAnnual) != null || num(m.netMarginAnnual) != null ? "FY"
          : "UNKNOWN";

        const r: Row = { symbol: sym, finnhubSymbol: finSym, grossMargin: gross, netMargin: net, period };
        return r;
      } catch {
        return { symbol: sym, finnhubSymbol: finSym, grossMargin: null, netMargin: null, period: "UNKNOWN" } as Row;
      }
    });

    const valid = baseRows.filter(r => r.grossMargin != null || r.netMargin != null);

    const topNetBase = [...valid]
      .filter(r => r.netMargin != null)
      .sort((a, b) => Number(b.netMargin) - Number(a.netMargin))
      .slice(0, limit);

    const topGrossBase = [...valid]
      .filter(r => r.grossMargin != null)
      .sort((a, b) => Number(b.grossMargin) - Number(a.grossMargin))
      .slice(0, limit);

    // 2) Kaliteli kâr için aday havuzu (top net + top gross + biraz genişlet)
    const candNet = [...valid].filter(r => r.netMargin != null).sort((a,b)=>Number(b.netMargin)-Number(a.netMargin)).slice(0, Math.max(limit * 3, 30));
    const candGross = [...valid].filter(r => r.grossMargin != null).sort((a,b)=>Number(b.grossMargin)-Number(a.grossMargin)).slice(0, Math.max(limit * 3, 30));

    const candMap = new Map<string, Row>();
    [...candNet, ...candGross].forEach(r => candMap.set(r.symbol, r));
    const candidates = Array.from(candMap.values());

    // 3) Adaylar için son 4 çeyrek serisini çek (sparkline + stabilite)
    const enriched = await mapLimit(candidates, 6, async (r) => {
      try {
        const fin = await finnhubFinancialsReportedQuarterlyCached(r.finnhubSymbol);
        const series = computeMarginsFromQuarterly(fin);
        if (!series) return r;

        const netS = series.netSeries.length ? series.netSeries : [];
        const grossS = series.grossSeries.length ? series.grossSeries : [];

        const vol = stddev(netS.length ? netS : grossS); // yoksa diğerini kullan
        const trend = slope(netS.length ? netS : grossS);

        // ✅ qualityScore: yüksek marj + düşük volatilite + trend bonus
        const net = r.netMargin ?? 0;
        const gross = r.grossMargin ?? 0;

        // volatilite cezası: 0-10 arası normalize
        const volPenalty = clamp(vol, 0, 10);

        const score =
          (0.6 * net + 0.4 * gross)     // ana kalite
          + clamp(trend * 0.2, -3, 3)   // trend bonus/ceza
          - volPenalty * 0.8;           // dalgalanma cezası

        return {
          ...r,
          netSeries: netS,
          grossSeries: grossS,
          volatility: vol,
          qualityScore: Number(score.toFixed(2)),
        } as Row;
      } catch {
        return r;
      }
    });

    const topQuality = [...enriched]
      .filter(r => r.qualityScore != null)
      .sort((a, b) => Number(b.qualityScore) - Number(a.qualityScore))
      .slice(0, limit);

    return NextResponse.json({
      data: {
        universe,
        updatedAt: new Date().toISOString(),
        periodHint: topNetBase[0]?.period ?? topGrossBase[0]?.period ?? "UNKNOWN",
        topNet: topNetBase,
        topGross: topGrossBase,
        topQuality,
      },
    });
  } catch (e: any) {
    console.error("top-margins error:", e?.message || e);
    return NextResponse.json({ data: { topNet: [], topGross: [], topQuality: [] } }, { status: 200 });
  }
}