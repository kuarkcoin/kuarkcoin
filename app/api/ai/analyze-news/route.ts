import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

function extractJson(text: string) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // direkt JSON ise
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) return cleaned;

  // metin içinde JSON yakala
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m?.[0]) return m[0];

  return cleaned;
}

export async function POST(req: Request) {
  try {
    const { symbol, newsItems } = await req.json();
    const limitedNewsItems = Array.isArray(newsItems) ? newsItems.slice(0, 20) : newsItems;

    if (!symbol) {
      return NextResponse.json({ ok: false, error: "symbol required" }, { status: 400 });
    }

    if (!limitedNewsItems || !Array.isArray(limitedNewsItems) || limitedNewsItems.length === 0) {
      return NextResponse.json({ ok: true, score: 0, explanation: "Haber bulunamadı.", impact: "LOW" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, error: "GEMINI_API_KEY missing" }, { status: 500 });

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
Sen bir kıdemli finansal analistsin. Aşağıdaki haber başlıklarını ${symbol} varlığı özelinde analiz et.

Görevlerin:
1) Haberlerin kısa vadeli fiyat etkisini -10 (Çok Negatif) ile +10 (Çok Pozitif) arasında puanla.
2) 0 puan: nötr/etkisiz.
3) Makro etkiler ve sektör korelasyonlarını düşün.
4) Aşırı iddialı çıkarım yapma; belirsizlik varsa MEDIUM/LOW seç.

Haberler:
${limitedNewsItems.map((n: any, i: number) => `${i + 1}. ${String(n.headline ?? "").slice(0, 180)}`).join("\n")}

SADECE şu JSON'u döndür:
{
  "score": number,
  "explanation": "Maksimum 20 kelimelik Türkçe özet",
  "impact": "HIGH" | "MEDIUM" | "LOW"
}
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const clean = extractJson(text);
    const analysis = JSON.parse(clean);

    // küçük validasyon
    const score = Number(analysis?.score ?? 0);
    const impact = String(analysis?.impact ?? "LOW").toUpperCase();
    const explanation = String(analysis?.explanation ?? "").slice(0, 200);

    return NextResponse.json({
      ok: true,
      score: isFinite(score) ? score : 0,
      impact: impact === "HIGH" || impact === "MEDIUM" || impact === "LOW" ? impact : "LOW",
      explanation: explanation || "Özet yok.",
      model: modelName,
    });
  } catch (error) {
    console.error("AI News Error:", error);
    return NextResponse.json({ ok: false, error: "Analiz başarısız." }, { status: 500 });
  }
}