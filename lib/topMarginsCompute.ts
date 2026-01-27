export type TopMarginRow = {
  symbol: string;
  finnhubSymbol: string;
  grossMargin: number | null;
  netMargin: number | null;
  period: "TTM" | "FY" | "UNKNOWN";
  grossSeries?: number[];
  netSeries?: number[];
  qualityScore?: number;
  volatility?: number;
};

export type TopMarginsPayload = {
  universe: "BIST100" | "NASDAQ100";
  updatedAt: string;
  periodHint: "TTM" | "FY" | "UNKNOWN";
  topNet: TopMarginRow[];
  topGross: TopMarginRow[];
  topQuality: TopMarginRow[];
};

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
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}
function slope(xs: number[]) {
  if (xs.length < 2) return 0;
  return xs[xs.length - 1] - xs[0];
}
function normalizeKey(s: any) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[\s\-_]+/g, "")
    .trim();
}

function toFinnhubSymbol(sym: string, universe: string) {
  const s = String(sym || "").trim();
  if (!s) return s;
  if (s.includes(".")) return s;
  return universe === "BIST100" ? `${s}.IS` : s;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url: string, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: 0 } });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function fetchFinnhubJson(url: string, attempt = 0): Promise<any> {
  const res = await fetchWithTimeout(url, 8000);

  if (res.status === 429 && attempt < 1) {
    const ra = Number(res.headers.get("retry-after") || "1");
    await sleep(Math.max(ra, 1) * 1000);
    return fetchFinnhubJson(url, attempt + 1);
  }

  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json();
}

async function finnhubMetric(symbol: string, token: string) {
  const url =
    `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}` +
    `&metric=all&token=${encodeURIComponent(token)}`;
  return fetchFinnhubJson(url);
}

async function finnhubFinancialsReportedQuarterly(symbol: string, token: string) {
  const url =
    `https://finnhub.io/api/v1/stock/financials-reported?symbol=${encodeURIComponent(symbol)}` +
    `&freq=quarterly&token=${encodeURIComponent(token)}`;
  return fetchFinnhubJson(url);
}

// concurrency limiter
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

// pickVal with TR+EN aliases
function pickVal(items: any[], aliases: string[]): number | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const keys = aliases.map(normalizeKey);

  for (const row of items) {
    const k = normalizeKey(row?.concept ?? row?.label ?? row?.name ?? row?.tag);
    if (!k) continue;
    if (keys.includes(k)) {
      const v = num(row?.value ?? row?.val ?? row?.amount);
      if (v != null) return v;
    }
  }

  for (const row of items) {
    const k = normalizeKey(row?.concept ?? row?.label ?? row?.name ?? row?.tag);
    if (!k) continue;
    for (const kk of keys) {
      if (k.includes(kk) || kk.includes(k)) {
        const v = num(row?.value ?? row?.val ?? row?.amount);
        if (v != null) return v;
      }
    }
  }

  return null;
}

function extractIncomeStatementItems(q: any): any[] {
  const report = q?.report ?? q?.reportContent ?? q ?? {};
  const candidates = [
    report?.ic,
    report?.incomeStatement,
    report?.income_statement,
    report?.incomestatement,
    report?.is,
    report?.data,
    report?.items,
    report,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (Array.isArray(c?.items)) return c.items;
    if (Array.isArray(c?.ic)) return c.ic;
    if (Array.isArray(c?.data)) return c.data;
  }
  return [];
}

function computeMarginsFromQuarterly(fin: any): { grossSeries: number[]; netSeries: number[] } | null {
  const data = fin?.data;
  if (!Array.isArray(data) || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => {
    const da = String(a?.endDate ?? a?.reportDate ?? a?.year ?? "");
    const db = String(b?.endDate ?? b?.reportDate ?? b?.year ?? "");
    return da.localeCompare(db);
  });

  const last4 = sorted.slice(-4);
  const grossSeries: number[] = [];
  const netSeries: number[] = [];

  for (const q of last4) {
    const items = extractIncomeStatementItems(q);

    const revenue =
      pickVal(items, [
        // EN
        "Revenue",
        "Revenues",
        "TotalRevenue",
        "Sales",
        "NetSales",
        "SalesRevenueNet",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        // TR
        "Hasılat",
        "SatisGelirleri",
        "SatışGelirleri",
      ]) ?? null;

    const grossProfit =
      pickVal(items, [
        "GrossProfit",
        "Gross Profit",
        // TR
        "BrütKar",
        "BrütKâr",
        "BrütKârZarar",
        "BrütKarZarar",
      ]) ?? null;

    const netIncome =
      pickVal(items, [
        "NetIncome",
        "NetIncomeLoss",
        "ProfitLoss",
        "NetProfit",
        // TR
        "NetDönemKârıZararı",
        "DonemNetKariZarari",
        "DönemNetKârıZararı",
      ]) ?? null;

    if (revenue != null && Number.isFinite(revenue) && revenue !== 0) {
      if (grossProfit != null && Number.isFinite(grossProfit)) grossSeries.push((grossProfit / revenue) * 100);
      if (netIncome != null && Number.isFinite(netIncome)) netSeries.push((netIncome / revenue) * 100);
    }
  }

  if (grossSeries.length < 2 && netSeries.length < 2) return null;
  return { grossSeries, netSeries };
}

export async function computeTopMargins(params: {
  universe: "BIST100" | "NASDAQ100";
  symbols: string[];
  limit?: number;
  finnhubToken: string;
}): Promise<TopMarginsPayload> {
  const { universe, symbols, finnhubToken } = params;
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);

  // 1) metric scan (TTM)
  const baseRows = await mapLimit(symbols, 6, async (sym) => {
    const finSym = toFinnhubSymbol(sym, universe);
    try {
      const j = await finnhubMetric(finSym, finnhubToken);
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

      const period: TopMarginRow["period"] =
        num(m.grossMarginTTM) != null || num(m.netMarginTTM) != null
          ? "TTM"
          : num(m.grossMarginAnnual) != null || num(m.netMarginAnnual) != null
          ? "FY"
          : "UNKNOWN";

      return { symbol: sym, finnhubSymbol: finSym, grossMargin: gross, netMargin: net, period } as TopMarginRow;
    } catch {
      return { symbol: sym, finnhubSymbol: finSym, grossMargin: null, netMargin: null, period: "UNKNOWN" } as TopMarginRow;
    }
  });

  const valid = baseRows.filter((r) => r.grossMargin != null || r.netMargin != null);

  const topNet = [...valid]
    .filter((r) => r.netMargin != null)
    .sort((a, b) => Number(b.netMargin) - Number(a.netMargin))
    .slice(0, limit);

  const topGross = [...valid]
    .filter((r) => r.grossMargin != null)
    .sort((a, b) => Number(b.grossMargin) - Number(a.grossMargin))
    .slice(0, limit);

  // 2) candidates (wider) for quality
  const candNet = [...valid]
    .filter((r) => r.netMargin != null)
    .sort((a, b) => Number(b.netMargin) - Number(a.netMargin))
    .slice(0, Math.max(limit * 3, 30));

  const candGross = [...valid]
    .filter((r) => r.grossMargin != null)
    .sort((a, b) => Number(b.grossMargin) - Number(a.grossMargin))
    .slice(0, Math.max(limit * 3, 30));

  const candMap = new Map<string, TopMarginRow>();
  [...candNet, ...candGross].forEach((r) => candMap.set(r.symbol, r));
  const candidates = Array.from(candMap.values());

  // 3) enrich candidates with quarterly series (best-effort)
  const enriched = await mapLimit(candidates, 3, async (r) => {
    const net = r.netMargin ?? 0;
    const gross = r.grossMargin ?? 0;

    // fallback score (even if series fails)
    const fallbackScore = Number((0.6 * net + 0.4 * gross).toFixed(2));

    // if net margin is negative, penalize heavily (quality filter)
    const negPenalty = (r.netMargin ?? 0) < 0 ? -25 : 0;

    try {
      const fin = await finnhubFinancialsReportedQuarterly(r.finnhubSymbol, finnhubToken);
      const series = computeMarginsFromQuarterly(fin);

      if (!series) {
        return { ...r, qualityScore: Number((fallbackScore + negPenalty).toFixed(2)) } as TopMarginRow;
      }

      const netS = series.netSeries?.length ? series.netSeries : [];
      const grossS = series.grossSeries?.length ? series.grossSeries : [];

      const useSeries = netS.length ? netS : grossS;
      const vol = stddev(useSeries);
      const trend = slope(useSeries);
      const volPenalty = clamp(vol, 0, 12);

      // ⚠️ “tek seferlik şişme” şüphesi: net çok yüksek ama brüt düşükse küçük ceza
      const oneOffPenalty =
        (r.netMargin ?? 0) > 35 && (r.grossMargin ?? 0) < 20 ? -3 : 0;

      const score =
        (0.6 * net + 0.4 * gross) +
        clamp(trend * 0.2, -3, 3) -
        volPenalty * 0.9 +
        oneOffPenalty +
        negPenalty;

      return {
        ...r,
        netSeries: netS,
        grossSeries: grossS,
        volatility: vol,
        qualityScore: Number(score.toFixed(2)),
      } as TopMarginRow;
    } catch {
      return { ...r, qualityScore: Number((fallbackScore + negPenalty).toFixed(2)) } as TopMarginRow;
    }
  });

  const topQuality = [...enriched]
    .filter((r) => r.qualityScore != null)
    .sort((a, b) => Number(b.qualityScore) - Number(a.qualityScore))
    .slice(0, limit);

  return {
    universe,
    updatedAt: new Date().toISOString(),
    periodHint: topNet[0]?.period ?? topGross[0]?.period ?? "UNKNOWN",
    topNet,
    topGross,
    topQuality,
  };
}