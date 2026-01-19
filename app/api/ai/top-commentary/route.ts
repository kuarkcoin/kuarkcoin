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
    .slice(0, 500); // Veri kaybını önlemek için sınırı biraz artırdık
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
    // Not: Model ismini ihtiyacına göre 'gemini-1.5-flash' veya 'gemini-1.5-pro' olarak güncelleyebilirsin.
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      systemInstruction: `
Sen kıdemli bir borsa stratejisti ve teknik analiz uzmanısın. 
Görevin, sana verilen skor ve teknik gerekçeleri (reasons) profesyonel bir terminal raporuna dönüştürmektir.
Analizlerinde şu kurallara uy:
1. Teknik terminolojiyi kullan (Momentum, RSI uyumsuzluğu, hareketli ortalamalar, trend kırılımı vb.).
2. Sadece ham veriyi kopyalama; verinin ne anlama geldiğini teknik bir dille yorumla.
3. Her madde doyurucu, en az 2-3 cümlelik derinliğe sahip olsun.
4. Kesinlik bildiren ifadelerden kaçın ("yükselecek" yerine "yükseliş potansiyeli taşıyor" gibi).
5. Yanıtın SADECE 5 maddelik bir liste formatında ve Türkçe olsun.
`,
      generationConfig: {
        temperature: 0.7, // Daha yaratıcı ve detaylı yorumlar için artırıldı
        maxOutputTokens: 1000, // Sözünün kesilmemesi için yükseltildi
      },
    });

    const prompt = `
Aşağıdaki teknik verileri kullanarak piyasa analizini oluştur:

[ALIM SİNYALLERİ (BUY)]
${JSON.stringify(buy2, null, 2)}

[SATIŞ SİNYALLERİ (SELL)]
${JSON.stringify(sell2, null, 2)}

Rapor Formatı ve İçerik:
- 1. Madde: En yüksek skorlu BUY hissesinin derinlemesine teknik analizi.
- 2. Madde: İkinci sıradaki BUY hissesinin teknik görünümü ve sinyal gücü.
- 3. Madde: En zayıf görünümlü SELL adayı (Aday yoksa genel bir uyarı maddesi yaz).
- 4. Madde: Genel Piyasa Görünümü (BUY/SELL dengesine göre piyasa duyarlılığı/sentiment analizi).
- 5. Madde: Stratejik Risk Notu (Hacim, volatilite veya endeks desteği üzerinden bir uyarı).

Teknik Puanlama Kriterin:
- Skor >= 25: Çok Güçlü / Aşırı Alım İştahı
- Skor 18-24: Orta / Trend Oluşumu
- Skor < 18: Zayıf / Teyit Bekleniyor
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim();

    return NextResponse.json({
      ok: true,
      commentary: text && text.length > 0 ? text : "Teknik analiz oluşturulamadı.",
    });
  } catch (e: any) {
    console.error("AI commentary error:", e);
    return NextResponse.json(
      { ok: false, error: "AI analiz hatası." },
      { status: 500 }
    );
  }
}
