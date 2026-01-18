// src/app/api/ai/top-commentary/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

type TopRow = {
  id?: number;
  symbol: string;
  signal?: string;
  price?: number | null;
  score?: number | null;
  reasons?: string | null;
  created_at?: string;
};

function safeJson(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function buildPrompt(topBuy: TopRow[], topSell: TopRow[]) {
  return `
Sen bir trading terminal analistisin. Aşağıdaki Top 5 BUY ve Top 5 SELL listesini yorumla.

Kurallar:
- Kesin konuşma, yatırım tavsiyesi verme.
- 6-10 cümle Türkçe yaz.
- BUY tarafında 2-3 güçlü adayın nedenlerini özetle.
- SELL tarafında 1-2 riskli adayın nedenlerini özetle.
- "Bugünün genel resmi" diye 1 cümle ekle.
- En sık geçen reason etiketlerini kısaca söyle (BUY ve SELL ayrı).
- Risk notu ekle: teyit ihtiyacı / false signal / volatilite.

TOP BUY JSON:
${safeJson(topBuy)}

TOP SELL JSON:
${safeJson(topSell)}
`.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topBuy: TopRow[] = Array.isArray(body?.topBuy) ? body.topBuy : [];
    const topSell: TopRow[] = Array.isArray(body?.topSell) ? body.topSell : [];

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY env eksik." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = buildPrompt(topBuy, topSell);

    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim() ?? "";

    return NextResponse.json({
      ok: true,
      commentary: text || "AI yorum üretemedi (boş cevap).",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "AI route hata" },
      { status: 500 }
    );
  }
}