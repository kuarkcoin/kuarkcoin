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
    reasons: r.reasons?.trim() ?? "",
    created_at: r.created_at ?? "",
  }));

async function generateWithFallback(genAI: GoogleGenerativeAI, prompt: string) {
  const models = ["gemini-2.5-flash", "gemini-1.5-flash"]; // fallback
  let lastErr: any = null;

  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        systemInstruction: `
Sen profesyonel bir trading terminal analistisin.
Verilen BUY/SELL listelerini rasyonel biçimde yorumla.
Kesin konuşma, yatırım tavsiyesi verme.
Yanıtların tamamen Türkçe olacak.
ÇIKTI formatı: SADECE 1-5 maddeleri, her madde 1-2 cümle.
`,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 500,
        },
      });

      const result = await model.generateContent(prompt);
      return result.response.text()?.trim() ?? "";
    } catch (e: any) {
      lastErr = e;
      // bir sonraki modele düş
    }
  }

  throw lastErr ?? new Error("AI model çağrısı başarısız.");
}

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

    const prompt = `
Aşağıdaki Top 5 BUY ve Top 5 SELL verilerini analiz et.

TOP BUY:
${JSON.stringify(slim(topBuy), null, 2)}

TOP SELL:
${JSON.stringify(slim(topSell), null, 2)}

Kurallar:
- Cevabı SADECE 1-5 maddeli formatta ver (başka hiçbir şey yazma).
- Reason'ları birebir kopyalama; doğal Türkçe ile özetle.
- Skor yorumu: 80+ çok güçlü, 60-79 orta, <60 zayıf/dikkat.

1) BUY tarafındaki 2-3 güçlü adayı ve ortak nedenlerini özetle.
2) SELL tarafındaki 1-2 riskli adayı ve risk nedenlerini belirt.
3) Bugünün genel resmi: (1 cümle)
4) En sık geçen reason etiketleri: BUY için / SELL için (kısa liste)
5) Risk notu: (teyit ihtiyacı / false signal / volatilite) + "yatırım tavsiyesi değildir."
`;

    const commentary = await generateWithFallback(genAI, prompt);

    return NextResponse.json({
      ok: true,
      commentary: commentary || "Analiz oluşturulamadı.",
    });
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Sunucu tarafında hata oluştu." },
      { status: 500 }
    );
  }
}