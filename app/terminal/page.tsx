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

const slim = (rows: TopRow[]) =>
  rows.slice(0, 5).map((r) => ({
    symbol: r.symbol,
    price: r.price ?? null,
    score: r.score ?? null,
    reasons: r.reasons ?? "",
    created_at: r.created_at ?? "",
  }));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topBuy: TopRow[] = Array.isArray(body?.topBuy) ? body.topBuy : [];
    const topSell: TopRow[] = Array.isArray(body?.topSell) ? body.topSell : [];

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "GEMINI_API_KEY yapılandırması eksik." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `
Sen profesyonel bir trading terminal analistisin.
Sana verilen BUY ve SELL listelerini rasyonel bir şekilde, kesin konuşmadan ve yatırım tavsiyesi vermeden yorumlarsın.
Yanıtların tamamen Türkçe, 6-10 cümle arasında ve profesyonel bir tonda olmalıdır.
`,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 500,
      },
    });

    const prompt = `
Aşağıdaki Top 5 BUY ve Top 5 SELL verilerini analiz et.

### TOP BUY:
${JSON.stringify(slim(topBuy), null, 2)}

### TOP SELL:
${JSON.stringify(slim(topSell), null, 2)}

Analiz Yapısı:
1) BUY tarafındaki 2-3 güçlü adayın (skoru yüksek olanlar) reasons etiketlerini özetle.
2) SELL tarafındaki 1-2 riskli adayın nedenlerini belirt.
3) "Bugünün genel resmi:" diye 1 cümlelik özet yaz.
4) En sık geçen reason etiketlerini BUY ve SELL için ayrı ayrı söyle.
5) Son cümlede risk notu ekle: (teyit ihtiyacı / false signal / volatilite) içinden uygun olan(lar).
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text()?.trim() ?? "";

    return NextResponse.json({
      ok: true,
      commentary: responseText || "Analiz oluşturulamadı.",
    });
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Sunucu tarafında hata oluştu." },
      { status: 500 }
    );
  }
}
