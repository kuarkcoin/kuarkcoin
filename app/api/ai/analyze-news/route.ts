import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonNoStore, readLimitedJson, requireAdminBearer, sanitizeNewsItems, validateGeminiNewsAnalysis } from "@/lib/server/aiSecurity";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
    const authError = await requireAdminBearer(req);
    if (authError) return authError;

    const body = await readLimitedJson(req);
    const symbol = String(body?.symbol ?? "").trim();
    const newsItems = sanitizeNewsItems(body?.newsItems);

    if (!symbol) {
      return jsonNoStore({ ok: false, error: "symbol required" }, { status: 400 });
    }

    if (!newsItems || !Array.isArray(newsItems) || newsItems.length === 0) {
      return jsonNoStore({ ok: true, score: 0, explanation: "Haber bulunamadı.", impact: "LOW" });
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
Sen bir kıdemli finansal analistsin. Aşağıdaki haber başlıklarını ${symbol} varlığı özelinde analiz et.

Görevlerin:
1) Haberlerin kısa vadeli fiyat etkisini -10 (Çok Negatif) ile +10 (Çok Pozitif) arasında puanla.
2) 0 puan: nötr/etkisiz.
3) Makro etkiler ve sektör korelasyonlarını düşün.
4) Aşırı iddialı çıkarım yapma; belirsizlik varsa MEDIUM/LOW seç.

Haberler:
${newsItems.map((n: any, i: number) => `${i + 1}. ${n.headline}`).join("\n")}

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

    const analysisResult = validateGeminiNewsAnalysis(analysis);

    return jsonNoStore({
      ok: true,
      ...analysisResult,
      model: modelName,
    });
  } catch (error: any) {
    if (error?.status) {
      return jsonNoStore({ ok: false, error: error.message || "Bad request." }, { status: error.status });
    }
    console.error("AI News Error:", error);
    return jsonNoStore({ ok: false, error: "Analiz başarısız." }, { status: 500 });
  }
}