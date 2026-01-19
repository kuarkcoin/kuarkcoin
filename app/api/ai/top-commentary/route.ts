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
    .replace(/[\r\n\t]/g, " ")
    .replace(/["`]/g, "'")
    .replace(/[{}[\]]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return s.slice(0, 260);
}

// ✅ TV sembol normalize (AI metninde de temiz görünsün)
function toPrettySymbol(sym: string) {
  if (!sym) return sym;
  if (sym.startsWith("BIST_DLY:")) return sym.replace("BIST_DLY:", "BIST:");
  return sym;
}

const slim = (rows: TopRow[]) =>
  rows.slice(0, 5).map((r) => ({
    symbol: toPrettySymbol(r.symbol),
    price: r.price ?? null,
    score: r.score ?? null,
    reasons: safeReasons(r.reasons),
    created_at: r.created_at ?? "",
  }));

function emptyFallback(topBuyLen: number, topSellLen: number) {
  const buyLine =
    topBuyLen === 0
      ? "BUY tarafında bugün Top aday görünmüyor; sinyal üretimi azalmış veya veri henüz gelmemiş olabilir."
      : "BUY tarafında adaylar mevcut; aşağıda kısa özet verildi.";

  const sellLine =
    topSellLen === 0
      ? "SELL tarafında bugün Top aday görünmüyor; risk uyarıları oluşmamış veya veri henüz gelmemiş olabilir."
      : "SELL tarafında adaylar mevcut; aşağıda kısa özet verildi.";

  return [
    `1) ${buyLine}`,
    `2) ${sellLine}`,
    `3) Bugünün genel resmi: Veri akışı sınırlı ise teyit ihtiyacı artar; işlem planını risk yönetimiyle kur.`,
    `4) Sık geçen reason etiketleri → BUY/SELL: veri azsa yorum sınırlıdır; varsa en çok tekrar edenler öne çıkar.`,
    `5) Risk notu: teyit ihtiyacı, false signal, volatilite ve haber akışı`,
  ].join("\n");
}

// ✅ AI çıktısını 5 maddeye zorla (model bazen format kaçırır)
function forceFiveLines(text: string) {
  const cleaned = (text ?? "").trim();
  if (!cleaned) return cleaned;

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // 1) ile başlayan 5 madde yakala
  const picked: string[] = [];
  for (const l of lines) {
    if (/^[1-5]\)/.test(l)) picked.push(l);
  }
  if (picked.length >= 5) return picked.slice(0, 5).join("\n");

  // format bozulduysa: yine 5 maddeye dön
  const body = cleaned.replace(/\s+/g, " ").slice(0, 800);
  return [
    `1) BUY: ${body.slice(0, 160)}`,
    `2) SELL: ${body.slice(160, 320) || "veri yok / sınırlı"}`,
    `3) Bugünün genel resmi: ${body.slice(320, 500) || "Piyasa görünümü sınırlı; teyit önemli."}`,
    `4) Öne çıkan etiketler: ${body.slice(500, 650) || "veri yok / sınırlı"}`,
    `5) Risk notu: ${body.slice(650, 800) || "Volatilite ve false signal riski."}`,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topBuy: TopRow[] = Array.isArray(body?.topBuy) ? body.topBuy : [];
    const topSell: TopRow[] = Array.isArray(body?.topSell) ? body.topSell : [];

    // ✅ Sadece ikisi de tamamen boşsa AI'a gitme
    if (topBuy.length === 0 && topSell.length === 0) {
      return NextResponse.json({
        ok: true,
        commentary: emptyFallback(0, 0),
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
BUY veya SELL verisi yoksa ilgili maddede açıkça "veri yok" yaz; formatı asla bozma.
`,
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 450,
      },
    });

    // ✅ Senin skorların 20-30 bandında; ölçeği buna göre ayarla
    const prompt = `
Aşağıdaki Top BUY ve Top SELL verilerini analiz et.

TOP BUY:
${JSON.stringify(slim(topBuy), null, 2)}

TOP SELL:
${JSON.stringify(slim(topSell), null, 2)}

Kurallar:
- Çıktı SADECE 5 maddeden oluşmalı ve şu şablonu takip etmeli:
  1) BUY tarafı: ...
  2) SELL tarafı: ...
  3) Bugünün genel resmi: ...
  4) Öne çıkan etiketler / davranış: ...
  5) Risk notu: ...
- BUY veya SELL listesi boşsa, ilgili maddede açıkça "veri yok" yaz ve yine 5 maddeyi tamamla.
- Reason'ları birebir kopyalama; doğal Türkçe ile özetle.
- Skor yorumu (bu sistem için):
  * >= 25 güçlü
  * 18-24 orta
  * < 18 zayıf/dikkat
`;

    const result = await model.generateContent(prompt);
    const responseText = (result.response.text() ?? "").trim();

    const finalText =
      responseText.length > 0
        ? forceFiveLines(responseText)
        : emptyFallback(topBuy.length, topSell.length);

    return NextResponse.json({
      ok: true,
      commentary: finalText,
    });
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Sunucu tarafında hata oluştu." },
      { status: 500 }
    );
  }
}