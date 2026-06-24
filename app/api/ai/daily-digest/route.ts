import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readJsonLimited, withTimeout } from "@/lib/http";
import { cleanAiText, requireAiConfigAndRateLimit } from "@/lib/ai-security";

type TopRow = {
  id: number;
  symbol: string;
  signal: string;
  price?: number | null;
  score?: number | null;
  reasons?: string | null;
  created_at?: string;
};

async function fetchNewsServer(symbol: string, reasons: string | null) {
  // server içinde /api/news’e internal call (key zaten serverda)
  const reasonKeys = (reasons ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");

  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}` +
    `/api/news?symbol=${encodeURIComponent(symbol)}&max=6&reasons=${encodeURIComponent(reasonKeys)}`;

  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return j?.items ?? [];
}

function clean(input: any, lim = 900) {
  return String(input ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[{}[\]]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, lim);
}

export async function POST(req: Request) {
  try {
    const limited = await readJsonLimited<any>(req, 32 * 1024);
    if (!limited.ok) return NextResponse.json({ ok: false, error: limited.error }, { status: limited.status });
    const rate = await requireAiConfigAndRateLimit(req, "daily-digest", 10, 60);
    if (rate) return rate;
    const body = limited.data ?? {};
    const topBuy: TopRow[] = Array.isArray(body?.topBuy) ? body.topBuy.slice(0, 5) : [];
    const topSell: TopRow[] = Array.isArray(body?.topSell) ? body.topSell.slice(0, 5) : [];

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY!;

    // unique symbol list
    const rows = [...topBuy, ...topSell].slice(0, 10);
    const uniqueSymbols = Array.from(new Set(rows.map((r) => r.symbol)));

    const newsBySymbol: Record<string, any[]> = {};
    for (const sym of uniqueSymbols) {
      const r = rows.find((x) => x.symbol === sym);
      newsBySymbol[sym] = await fetchNewsServer(sym, r?.reasons ?? null);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Aşağıdaki veriler bir trading dashboard'undaki Top5 BUY/SELL sinyalleridir. 
Her sembolün "reasons" (teknik gerekçeler) ve "ilintili haberleri" var.
İstenen çıktı:
- 6-10 satırda günlük özet
- BUY tarafında 2-3 sembol seç: neden güçlü, hangi haber bunu destekliyor?
- SELL tarafında 1-2 risk uyarısı: hangi haber/tema baskı yaratıyor?
- En sonda "Risk Notu" (yatırım tavsiyesi değildir, volatilite, haber-akış riski)

Top BUY:
${topBuy.map((r) => `- ${r.symbol} score:${r.score} price:${r.price} reasons:${clean(r.reasons, 220)}`).join("\n")}

Top SELL:
${topSell.map((r) => `- ${r.symbol} score:${r.score} price:${r.price} reasons:${clean(r.reasons, 220)}`).join("\n")}

News:
${Object.entries(newsBySymbol).map(([sym, arr]) => {
  const items = (arr ?? []).slice(0, 3).map((n: any) => `• ${clean(n.headline, 140)} (${clean(n.source, 30)})`).join("\n");
  return `# ${sym}\n${items || "• (no news)"}`;
}).join("\n\n")}
`;

    const timeout = withTimeout(15_000);
    const out = await Promise.race([model.generateContent(prompt), new Promise<never>((_, rej) => timeout.signal.addEventListener("abort", () => rej(new Error("timeout"))))]);
    timeout.done();
    const text = cleanAiText(out?.response?.text() ?? "", 3000);

    return NextResponse.json({ ok: true, commentary: text });
  } catch {
    return NextResponse.json({ ok: false, error: "digest failed" }, { status: 500 });
  }
}