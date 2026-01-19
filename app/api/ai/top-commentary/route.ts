import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

type TopRow = {
  symbol: string;
  price?: number | null;
  score?: number | null;
  reasons?: string | null;
};

// -------- yardımcılar --------
function cleanReasons(input?: string | null) {
  return (input ?? "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/["`]/g, "'")
    .replace(/[{}[\]]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 300);
}

function toPrettySymbol(sym: string) {
  if (sym.startsWith("BIST_DLY:")) return sym.replace("BIST_DLY:", "BIST:");
  return sym;
}

function pickTop2(rows: TopRow[]) {
  return [...rows]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 2)
    .map((r) => ({
      symbol: toPrettySymbol(r.symbol),
      score: r.score ?? 0,
      reasons: cleanReasons(r.reasons),
    }));
}

// -------- route --------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topBuy: TopRow[] = Array.isArray(body?.topBuy) ? body.topBuy : [];
    const topSell: TopRow[] = Array.isArray(body?.topSell) ? body.topSell : [];

    if (topBuy.length === 0 && topSell.length === 0) {
      return NextResponse.json({
        ok: true,
        commentary:
          "1) BUY – Aday yok.\n" +
          "2) BUY – Aday yok.\n" +
          "3) SELL – Aday yok.\n" +
          "4) Genel Piyasa Görünümü: Veri yetersiz.\n" +
          "5) Risk Notu: İşlem için teyit beklenmeli.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "GEMINI_API_KEY eksik." },
        { status: 500 }
      );
    }

    const buy2 = pickTop2(topBuy);
    const sell2 = pickTop2(topSell);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `
Sen profesyonel bir trading terminal analistisin.
Hisse hisse konuş, teknik gerekçelerle yorum yap.
Kesin konuşma, yatırım tavsiyesi verme.
Cevap SADECE 5 maddelik formatta ve Türkçe olacak.
`,
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 500,
      },
    });

    const prompt = `
Aşağıdaki verileri kullanarak analiz yap.

EN İYİ 2 BUY:
${JSON.stringify(buy2, null, 2)}

EN İYİ 2 SELL:
${JSON.stringify(sell2, null, 2)}

Kurallar:
- 1. madde: En güçlü BUY (hisse adıyla, teknik nedenlerle)
- 2. madde: İkinci BUY
- 3. madde: En güçlü SELL (yoksa "aday yok" de)
- 4. madde: Genel piyasa görünümü (BUY/SELL dengesi)
- 5. madde: Risk notu
- Reason'ları aynen kopyalama, teknik dile çevir.
- Skor yorumu:
  >=25 güçlü, 18–24 orta, <18 zayıf.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim();

    return NextResponse.json({
      ok: true,
      commentary: text && text.length > 0 ? text : "Analiz üretilemedi.",
    });
  } catch (e: any) {
    console.error("AI commentary error:", e);
    return NextResponse.json(
      { ok: false, error: "AI analiz hatası." },
      { status: 500 }
    );
  }
}