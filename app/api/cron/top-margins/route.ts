import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { safeCompareSecret } from "@/lib/safeCompareSecret";
import { computeTopMargins, type TopMarginsPayload } from "@/lib/topMarginsCompute";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";
// (plan izin veriyorsa) uzun hesapta faydalı
export const maxDuration = 30;

// LISTS (istersen bunları src/constants/universe.ts'e taşıyıp import et)
const BIST100 = [
  "AKBNK","ALARK","ARCLK","ASELS","BIMAS","BRYAT","CIMSA","DOAS","EKGYO",
  "ENJSA","EREGL","FROTO","GARAN","GUBRF","HALKB","HEKTS","ISCTR","KCHOL",
  "KOZAA","KOZAL","KRDMD","MGROS","PETKM","SAHOL","SISE","TCELL","THYAO",
  "TOASO","TTKOM","TUPRS","YKBNK",
  // ... 100'ü tamamla
];

const NASDAQ100 = [
  "AAPL","MSFT","NVDA","AMZN","META","GOOG","GOOGL","TSLA","NFLX","ADBE",
  "AMD","INTU","PEP","QCOM","AMGN","ADI","CSCO","TMUS","REGN","VRTX",
  "SNPS","CDNS","PANW","CRWD","MU","LRCX","KLAC","ASML","AVGO","TXN",
  // ... 100'ü tamamla
];

type UniverseJob = {
  universe: TopMarginsPayload["universe"];
  symbols: string[];
  kvKey: string;
};

const UNIVERSE_JOBS: UniverseJob[] = [
  { universe: "BIST100", symbols: BIST100, kvKey: "top_margins:BIST100" },
  { universe: "NASDAQ100", symbols: NASDAQ100, kvKey: "top_margins:NASDAQ100" },
];

function getBearerToken(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token || authorization.split(" ").length !== 2) {
    return "";
  }

  return token;
}

function mustAuth(req: Request) {
  return safeCompareSecret(getBearerToken(req), process.env.CRON_SECRET);
}

export async function GET(req: Request) {
  try {
    if (!mustAuth(req)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const finnhubToken = process.env.FINNHUB_API_KEY;
    if (!finnhubToken) {
      return NextResponse.json({ ok: false, error: "Missing FINNHUB_API_KEY" }, { status: 500 });
    }

    const results = await Promise.allSettled(
      UNIVERSE_JOBS.map(async (job) => {
        const payload = await computeTopMargins({
          universe: job.universe,
          symbols: job.symbols,
          limit: 10,
          finnhubToken,
        });

        await kv.set(job.kvKey, payload);
        return job.universe;
      }),
    );

    const saved: TopMarginsPayload["universe"][] = [];
    const failed: TopMarginsPayload["universe"][] = [];

    results.forEach((result, index) => {
      const universe = UNIVERSE_JOBS[index].universe;

      if (result.status === "fulfilled") {
        saved.push(result.value);
        return;
      }

      failed.push(universe);
      const message = result.reason instanceof Error ? result.reason.message : "unknown_error";
      console.error("cron top-margins universe failed", { universe, message });
    });

    if (saved.length > 0) {
      await kv.set("top_margins:lastRun", new Date().toISOString());
    }

    const at = new Date().toISOString();

    if (failed.length > 0) {
      return NextResponse.json({ ok: false, error: "cron_failed", saved, failed, at }, { status: 500 });
    }

    return NextResponse.json({ ok: true, saved, at });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown_error";
    console.error("cron top-margins error", { message });
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 500 });
  }
}
