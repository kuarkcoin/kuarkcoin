import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { word, meaning } = await req.json();

    const keys = [
      process.env.GOOGLE_API_KEY,
      process.env.GOOGLE_KEY_2,
      process.env.GOOGLE_KEY_3,
      process.env.GOOGLE_KEY_4,
      process.env.GOOGLE_KEY_5,
      process.env.GOOGLE_KEY_6,
      process.env.GOOGLE_KEY_7,
      process.env.GOOGLE_KEY_8,
      process.env.GOOGLE_KEY_9,
      process.env.GOOGLE_KEY_10,
    ].filter(Boolean) as string[];

    // DEBUG: Kaç tane key okunabiliyor? Terminalden bak.
    console.log(`Sistemde aktif ${keys.length} adet key var.`);

    const shuffledKeys = keys.sort(() => Math.random() - 0.5);

    const prompt = `Return ONLY JSON for English word "${word}" (Meaning: ${meaning}). Format: {"en": "sentence", "tr": "çeviri"}`;

    for (let i = 0; i < shuffledKeys.length; i++) {
      const apiKey = shuffledKeys[i];
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const r = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
          }),
        });

        if (r.status === 429) {
          console.warn(`Key ${i + 1} limiti dolmuş (429), sonrakine geçiliyor...`);
          continue; 
        }

        if (!r.ok) {
          const errBody = await r.json();
          console.error(`Key ${i + 1} hata verdi (Status: ${r.status}):`, errBody);
          continue;
        }

        const data = await r.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
        
        // JSON Cımbızlama (Daha güvenli)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;
        
        const parsed = JSON.parse(jsonMatch[0]);

        return NextResponse.json({
          en: String(parsed.en || ""),
          tr: String(parsed.tr || ""),
          note_tr: String(parsed.note_tr || ""),
        });

      } catch (err) {
        console.error(`Key ${i + 1} denemesinde beklenmedik hata:`, err);
        continue;
      }
    }

    return NextResponse.json({ error: "Şu an tüm anahtarların limiti dolu veya anahtarlar geçersiz." }, { status: 429 });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
