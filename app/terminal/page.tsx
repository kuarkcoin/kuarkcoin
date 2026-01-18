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

// ✅ Prompt injection / format kırılmasını azaltan sanitize
function safeReasons(input: string | null | undefined) {
  const s = (input ?? "")
    .replace(/[\r\n\t]/g, " ")         // newline/tab yok
    .replace(/["`]/g, "'")            // tırnak/backtick kırmasın
    .replace(/[{}[\]]/g, " ")         // JSON/prompt kırma azalt
    .replace(/\s{2,}/g, " ")
    .trim();

  // ✅ Uzun reasons'ları kırp (AI'a şişirme yapmasın)
  return s.slice(0, 260);
}

const slim = (rows: TopRow[]) =>
  rows.slice(0, 5).map((r) => ({
    symbol: r.symbol,
    price: r.price ?? null,
    score: r.score ?? null,
    reasons: safeReasons(r.reasons),
    created_at: r.created_at ?? "",
  }));

// ✅ Boş veri için sabit cevap üreten helper
function emptyFallback(topBuyLen: number, topSellLen: number) {
  // 5 madde formatını BOZMADAN dönüyoruz
  const buyLine =
    topBuyLen === 0
      ? "BUY tarafında bugün Top aday görünmüyor; sinyal üretimi azalmış veya veri henüz gelmemiş olabilir."
      : "BUY tarafında adaylar mevcut; detay için reasons özetlenecek.";

  const sellLine =
    topSellLen === 0
      ? "SELL tarafında bugün Top aday görünmüyor; risk uyarıları oluşmamış veya veri henüz gelmemiş olabilir."
      : "SELL tarafında adaylar mevcut; detay için reasons özetlenecek.";

  return [
    `1) ${buyLine}`,
    `2) ${sellLine}`,
    `3) Bugünün genel resmi: Veri akışı sınırlı olduğu için piyasayı net okumak zor; teyit ihtiyacı yüksek.`,
    `4) Sık geçen reason etiketleri → BUY: yok/az veri • SELL: yok/az veri`,
    `5) Risk notu: teyit ihtiyacı, false signal, volatilite`,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topBuy: TopRow[] = Array.isArray(body?.topBuy) ? body.topBuy : [];
    const topSell: TopRow[] = Array.isArray(body?.topSell) ? body.topSell : [];

    // ✅ Eğer ikisi de boşsa AI'a hiç gitme (en temiz çözüm)
    if (topBuy.length === 0 && topSell.length === 0) {
      return NextResponse.json({
        ok: true,
        commentary: emptyFallback(0, 0),
      });
    }

    // ✅ Eğer biri boşsa yine AI'a gitmeyebiliriz (isteğe bağlı)
    // Ben yine sabit dönmeyi seçtim, çünkü “yarıda kesme” %0 olur:
    if (topBuy.length === 0 || topSell.length === 0) {
      return NextResponse.json({
        ok: true,
        commentary: emptyFallback(topBuy.length, topSell.length),
      });
    }

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
Kesin konuşma, yatırım tavsiyesi verme.
Cevap tamamen Türkçe ve SADECE 5 maddelik formatta olmalı.
Eğer veriler kısmi ise, ilgili maddede "veri yok" diyerek tamamla; formatı asla bozma.
`,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 450,
      },
    });

    const prompt = `
Aşağıdaki Top 5 BUY ve Top 5 SELL verilerini analiz et.

TOP BUY:
${JSON.stringify(slim(topBuy), null, 2)}

TOP SELL:
${JSON.stringify(slim(topSell), null, 2)}

Kurallar:
- Çıktı SADECE 5 maddeden oluşmalı ve şu şablonu takip etmeli:
  1) ...
  2) ...
  3) Bugünün genel resmi: ...
  4) ...
  5) Risk notu: ...
- BUY veya SELL listesi boşsa, ilgili maddede açıkça "veri yok" yaz ve yine 5 maddeyi tamamla.
- Reason'ları birebir kopyalama; doğal Türkçe ile özetle.
- Skor yorumu: 80+ çok güçlü, 60-79 orta, <60 zayıf/dikkat.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text()?.trim() ?? "";

    // ✅ Model boş dönerse de fallback
    return NextResponse.json({
      ok: true,
      commentary:
        responseText.length > 0 ? responseText : emptyFallback(topBuy.length, topSell.length),
    });
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Sunucu tarafında hata oluştu." },
      { status: 500 }
    );
  }
}
