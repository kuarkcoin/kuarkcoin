import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_UNIVERSE = ["BIST100", "NASDAQ300", "ETF"] as const;
type Universe = (typeof ALLOWED_UNIVERSE)[number];

type NewsItem = {
  datetime?: number;
  tickers?: string[];
  tags?: string[];
  source?: string;
};

function noStore(json: any, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

function istanbulDateYmd(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function plainSymbol(sym: string) {
  const s = sym.trim();
  const idx = s.indexOf(":");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

function clamp(v: number | null) {
  if (v == null || Number.isNaN(v)) return null;
  return Math.max(0, Math.min(100, v));
}

function estimateNewsImpact(n: NewsItem) {
  const tick = (n.tickers ?? []).length;
  const tags = (n.tags ?? []).map((x) => String(x).toUpperCase());
  let score = 10;

  score += Math.min(30, tick * 6);

  if (tags.includes("SATIN_ALMA") || tags.includes("BIRLESME")) score += 25;
  if (tags.includes("TEMETTU") || tags.includes("GERI_ALIM")) score += 18;
  if (tags.includes("YUKSEK_KAR")) score += 14;
  if (tags.includes("NEGATIF")) score += 16;

  const src = String(n.source || "").toLowerCase();
  if (src.includes("reuters") || src.includes("bloomberg")) score += 10;

  const nowSec = Math.floor(Date.now() / 1000);
  const age = nowSec - Number(n.datetime || 0);
  if (age <= 2 * 3600) score += 5;
  else if (age <= 12 * 3600) score += 2;

  return Math.max(0, Math.min(100, score));
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const u = String(searchParams.get("u") ?? "BIST100").toUpperCase();
  const universe: Universe = (ALLOWED_UNIVERSE as readonly string[]).includes(u) ? (u as Universe) : "BIST100";
  const limitRaw = Number(searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 10;

  const supa = supabaseServer();
  const today = istanbulDateYmd();

  const { data: signals, error: sigErr } = await supa
    .from("signals")
    .select("symbol,symbol_plain,score,reasons,created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (sigErr) return noStore({ ok: false, error: sigErr.message }, { status: 500 });

  const latestBySymbol = new Map<string, any>();
  for (const row of signals ?? []) {
    const sym = plainSymbol(String((row as any).symbol_plain ?? row.symbol ?? "")).toUpperCase();
    if (!sym || latestBySymbol.has(sym)) continue;
    latestBySymbol.set(sym, row);
  }

  const symbols = Array.from(latestBySymbol.keys());
  if (!symbols.length) return noStore({ ok: true, universe, items: [] });

  const { data: prices } = await supa
    .from("daily_prices")
    .select("symbol,close,change_pct")
    .eq("date", today)
    .in("symbol", symbols);

  const priceMap = new Map<string, any>();
  for (const r of prices ?? []) {
    priceMap.set(String(r.symbol).toUpperCase(), r);
  }

  const { data: fundRows } = await supa
    .from("fundamentals_snapshot")
    .select("symbol,asof,quality_score")
    .in("symbol", symbols)
    .order("asof", { ascending: false });

  const fundMap = new Map<string, number | null>();
  for (const row of fundRows ?? []) {
    const sym = String(row.symbol ?? "").toUpperCase();
    if (!sym || fundMap.has(sym)) continue;
    fundMap.set(sym, clamp(typeof row.quality_score === "number" ? row.quality_score : Number(row.quality_score)));
  }

  let newsItems: NewsItem[] = [];
  try {
    const res = await fetch(`${origin}/api/news/combined?u=${encodeURIComponent(universe)}&limit=60&minScore=0`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const json = await res.json();
      newsItems = Array.isArray(json?.items) ? json.items : [];
    }
  } catch {
    newsItems = [];
  }

  const cutoff = Math.floor(Date.now() / 1000) - 24 * 3600;
  const newsScoreMap = new Map<string, number>();
  for (const n of newsItems) {
    if ((n.datetime ?? 0) < cutoff) continue;
    const impact = estimateNewsImpact(n);
    for (const t of n.tickers ?? []) {
      const sym = plainSymbol(String(t)).toUpperCase();
      if (!sym) continue;
      const prev = newsScoreMap.get(sym);
      if (prev == null || impact > prev) newsScoreMap.set(sym, impact);
    }
  }

  const sparkMap = new Map<string, number[]>();
  await Promise.all(
    symbols.map(async (sym) => {
      const { data } = await supa
        .from("daily_prices")
        .select("close,date")
        .eq("symbol", sym)
        .order("date", { ascending: false })
        .limit(20);
      const vals = (data ?? [])
        .slice()
        .reverse()
        .map((x: any) => (typeof x.close === "number" ? x.close : Number(x.close)))
        .filter((x) => Number.isFinite(x));
      sparkMap.set(sym, vals);
    }),
  );

  const items = symbols
    .map((sym) => {
      const sig = latestBySymbol.get(sym);
      const p = priceMap.get(sym);
      const techScore = clamp(typeof sig?.score === "number" ? sig.score : Number(sig?.score));
      const fundScore = clamp(fundMap.get(sym) ?? null);
      const newsScore = clamp(newsScoreMap.get(sym) ?? null);
      const allNull = techScore == null && fundScore == null && newsScore == null;
      const overallScore = allNull
        ? null
        : clamp(0.55 * (techScore ?? 0) + 0.35 * (fundScore ?? 0) + 0.1 * (newsScore ?? 0));

      return {
        symbol: sym,
        price: p?.close ?? null,
        changePct: p?.change_pct ?? null,
        techScore,
        fundScore,
        newsScore,
        overallScore,
        reasons: [],
        spark: sparkMap.get(sym) ?? [],
      };
    })
    .sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
    .slice(0, limit);

  return noStore({ ok: true, universe, items });
}
