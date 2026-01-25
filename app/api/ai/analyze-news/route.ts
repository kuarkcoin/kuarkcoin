import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { symbol, newsItems } = await req.json();

    if (!newsItems || newsItems.length === 0) {
      return NextResponse.json({ ok: true, score: 0, explanation: "Haber bulunamadı." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Sen bir kıdemli finansal analistsin. Aşağıdaki haber başlıklarını ${symbol} hissesi/varlığı özelinde analiz et.
      
      Görevlerin:
      1. Haberlerin bu varlığın fiyatına kısa vadeli etkisini -10 (Çok Negatif) ile +10 (Çok Pozitif) arasında puanla.
      2. 0 puan "Nötr" veya "Etkisiz" demektir.
      3. Analizini yaparken makro ekonomik verileri ve sektörel korelasyonları düşün.
      
      Haberler:
      ${newsItems.map((n: any, i: number) => `${i + 1}. ${n.headline}`).join("\n")}

      SADECE aşağıdaki JSON formatında cevap ver:
      {
        "score": number,
        "explanation": "Maksimum 20 kelimelik Türkçe özet açıklama",
        "impact": "HIGH" | "MEDIUM" | "LOW"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON parse işlemi (Gemini bazen markdown içinde gönderir, onu temizliyoruz)
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const analysis = JSON.parse(cleanJson);

    return NextResponse.json({ ok: true, ...analysis });
  } catch (error) {
    console.error("AI News Error:", error);
    return NextResponse.json({ ok: false, error: "Analiz başarısız." }, { status: 500 });
  }
}
