import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { computeTopMargins } from "@/lib/topMarginsCompute";

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

function mustAuth(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  return token && token === process.env.CRON_SECRET;
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

    const [bist, nasdaq] = await Promise.all([
      computeTopMargins({ universe: "BIST100", symbols: BIST100, limit: 10, finnhubToken }),
      computeTopMargins({ universe: "NASDAQ100", symbols: NASDAQ100, limit: 10, finnhubToken }),
    ]);

    // KV write
    await kv.set("top_margins:BIST100", bist);
    await kv.set("top_margins:NASDAQ100", nasdaq);
    await kv.set("top_margins:lastRun", new Date().toISOString());

    return NextResponse.json({ ok: true, saved: ["BIST100", "NASDAQ100"], at: new Date().toISOString() });
  } catch (e: any) {
    console.error("cron top-margins error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 200 });
  }
}