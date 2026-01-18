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

/**
 * Prompt injection engellemek ve token tasarrufu için metni temizler.
 */
function safeReasons(input: string | null | undefined) {
  const s = (input ?? "")
    .replace(/[\r\n\t]/g, " ")         // Newline ve tab temizliği
    .replace(/["`]/g, "'")            // Tırnak işaretlerini normalize et
    .replace(/[{}[\]]/g, " ")         // JSON benzeri yapıları boz
    .replace(/\s{2,}/g, " ")          // Fazla boşlukları sil
    .trim();

  return s.slice(0, 260);             // Maksimum uzunluk sınırı
}

/**
 * Veriyi sadece AI'nın ihtiyacı olan kısımlara indirger.
 */
const slim = (rows: TopRow[]) =>
  rows.slice(0, 5).map((r) => ({
    symbol: r.symbol,
    price: r.price ?? null,
    score: r.score ?? null,
    reasons: safeReasons(r.reasons),
  }));

/**
 * Veri olmadığında veya AI hata verdiğinde dönülecek güvenli yanıt.
 */
function emptyFallback(topBuyLen: number, topSellLen: number) {
  const buyLine = topBuyLen === 0 
    ? "BUY tarafında veri yok; sinyal üretimi henüz gerçekleşmemiş." 
    : "BUY tarafında adaylar mevcut, detaylar analiz ediliyor.";
    
  const sellLine = topSellLen === 0 
    ? "SELL tarafında veri yok; risk uyarısı bulunmuyor." 
    : "SELL tarafında adaylar mevcut, riskler inceleniyor.";

  return [
    `1) ${buyLine}`,
    `2) ${sellLine}`,
    `3) Bugünün genel resmi: Veri akışı kısıtlı olduğundan piyasa yönü belirsiz.`,
    `4) Etiketler: Veri yetersiz.`,
    `5) Risk notu: Teyit almadan işlem yapılması önerilmez.`,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topBuy: TopRow[] = Array.isArray(body?.topBuy) ? body.topBuy : [];
    const topSell: TopRow[] = Array.isArray(body?.topSell) ? body.topSell : [];

    // Veri tamamen boşsa API'ye gitmeden dön
    if (topBuy.length === 0 && topSell.length === 0) {
      return NextResponse.json({
        ok: true,
        commentary: emptyFallback(0, 0),
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "GEMINI_API_KEY bulunamadı." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `Sen profesyonel bir trading terminali analistisin. 
Sana gelen verileri kullanarak 5 maddelik bir piyasa özeti oluşturmalısın. 
Asla yatırım tavsiyesi verme. Kesinlik bildiren cümlelerden kaçın. 
Dilin tamamen Türkçe olmalı. Eğer bir liste boşsa "veri yok" de ama 5 madde formatını asla bozma.`,
      generationConfig: {
        temperature: 0.4, // Daha tutarlı yanıtlar için biraz düşürdük
        maxOutputTokens: 500,
      },
    });

    const prompt = `
Aşağıdaki BUY ve SELL listelerini analiz et:

TOP BUY (Yükseliş Beklenenler):
${JSON.stringify(slim(topBuy), null, 2)}

TOP SELL (Düşüş Beklenenler):
${JSON.stringify(slim(topSell), null, 2)}

Kurallar:
- Yanıt SADECE 5 maddeden oluşmalı.
- Şablon:
  1) BUY analizi (Sembol ve Skor değinerek)
  2) SELL analizi (Sembol ve Skor değinerek)
  3) Bugünün genel resmi: [Özet]
  4) Teknik Etiketler: [Reason'lardaki ortak noktalar]
  5) Risk notu: [Kritik uyarılar]
- Puanlama Rehberi: 80+ Güçlü, 60-79 Orta, <60 Zayıf.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text()?.trim();

    return NextResponse.json({
      ok: true,
      commentary: responseText || emptyFallback(topBuy.length, topSell.length),
    });

  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
