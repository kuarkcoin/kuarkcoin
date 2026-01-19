import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

type TopRow = {
  symbol: string;
  price?: number | null;
  score?: number | null;
  reasons?: string | null;
};

// ------------------ Helpers ------------------
function cleanReasons(input?: string | null) {
  return (input ?? "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/["`]/g, "'")
    .replace(/[{}[\]]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 380);
}

function toPrettySymbol(sym: string) {
  if (!sym) return sym;
  if (sym.startsWith("BIST_DLY:")) return sym.replace("BIST_DLY:", "BIST:");
  return sym;
}

function scoreBand(score?: number | null) {
  const s = score ?? 0;
  if (s >= 25) return "Güçlü";
  if (s >= 18) return "Orta";
  return "Zayıf";
}

function mapReasonsToTech(reasons: string) {
  const r = (reasons || "").toLowerCase();

  const points: string[] = [];

  if (r.includes("macd")) points.push("MACD tarafında momentum dönüşü / kesişim etkisi");
  if (r.includes("vwap üst")) points.push("VWAP üzeri tutunma trend teyidini güçlendiriyor");
  if (r.includes("vwap alt")) points.push("VWAP altı fiyatlama zayıflama işareti olabilir");
  if (r.includes("hacim")) points.push("Hacim davranışı katılımı destekliyor (teyit için önemli)");
  if (r.includes("günlük onay")) points.push("Günlük zaman diliminden teyit sinyal kalitesini artırır");
  if (r.includes("satış baskısı")) points.push("Satış baskısı/dağıtım ihtimali artmış görünüyor");
  if (r.includes("rsi")) points.push("RSI bölgesi aşırılaşma / momentum yorgunluğu sinyali verebilir");

  // hiç eşleşmezse genel ama teknik kal
  if (points.length === 0) {
    points.push("Etiketler genel momentum + trend teyidi + katılım (hacim) ekseninde okunmalı");
  }

  // 2-3 teknik cümleye sıkıştır
  return points.slice(0, 3).join(". ") + ".";
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

// ✅ AI ne dönerse dönsün: 5 maddeyi çekmeye çalış
function forceFiveBullets(text?: string | null) {
  if (!text) return null;

  // markdown vb. temizle
  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/#+\s?/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .trim();

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // 1) / 1. / 1] gibi başlatanları yakala
  const bullets = lines.filter((l) => /^[1-5][\)\.\]]\s*/.test(l));
  if (bullets.length >= 5) return bullets.slice(0, 5).join("\n");

  return null; // format kaçtıysa fallback
}

// ✅ Kesin 5 madde (AI patlarsa bile)
function deterministicFallback(
  buy2: ReturnType<typeof pickTop2>,
  sell2: ReturnType<typeof pickTop2>
) {
  const b1 = buy2[0];
  const b2 = buy2[1];
  const s1 = sell2[0];
  const s2 = sell2[1];

  const buyText = (x?: typeof b1) => {
    if (!x) return "Aday yok.";
    const tech = mapReasonsToTech(x.reasons || "");
    return `${x.symbol} (Skor: ${x.score} • ${scoreBand(x.score)}). ${tech} Teyit için kapanış davranışı ve trend devamlılığı izlenmeli.`;
  };

  const sellText = (x?: typeof s1) => {
    if (!x) return "Aday yok (bugün güçlü bozulma/risk etiketleri öne çıkmıyor).";
    const tech = mapReasonsToTech(x.reasons || "");
    return `${x.symbol} (Skor: ${x.score} • ${scoreBand(x.score)}). ${tech} Risk: zayıflama kalıcı olursa geri çekilme derinleşebilir; teyit arayın.`;
  };

  const m1 = `1) BUY – ${buyText(b1)}`;
  const m2 = `2) BUY – ${buyText(b2)}`;
  const m3 =
    sell2.length > 0
      ? `3) SELL – ${sellText(s1)}${s2 ? " İkinci aday: " + sellText(s2) : ""}`
      : `3) SELL – ${sellText(undefined)}`;
  const m4 = `4) Genel Piyasa Görünümü: BUY tarafı ${buy2.length ? "daha aktif" : "zayıf"}, SELL tarafı ${sell2.length ? "risk uyarısı veriyor" : "sınırlı"}. Endeks/hacim teyidi kritik.`;
  const m5 = `5) Risk Notu: False sinyal, volatilite ve haber akışı riski; tek göstergeye dayanma, stop/plan şart.`;

  return [m1, m2, m3, m4, m5].join("\n");
}

// ------------------ Route ------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topBuy: TopRow[] = Array.isArray(body?.topBuy) ? body.topBuy : [];
    const topSell: TopRow[] = Array.isArray(body?.topSell) ? body.topSell : [];

    const buy2 = pickTop2(topBuy);
    const sell2 = pickTop2(topSell);

    // veri tamamen boşsa
    if (buy2.length === 0 && sell2.length === 0) {
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

    // API key yoksa bile düzgün 5 madde üret
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        ok: true,
        commentary: deterministicFallback(buy2, sell2),
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ 2.5 flash
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `
Sen bir trading terminal analistisin.
ASLA selamlaşma/hitap yazma.
ASLA markdown kullanma.
ASLA giriş paragrafı yazma.
Çıktı sadece 5 maddeden oluşacak ve her madde şu formatta başlayacak:
1) ...
2) ...
3) ...
4) ...
5) ...
Her madde 2-3 cümle, hisse bazlı ve teknik dille yazılacak.
Kesin konuşma, yatırım tavsiyesi verme.
`,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 650,
      },
    });

    const prompt = `
Elindeki veriler:
BUY (en iyi 2):
${JSON.stringify(buy2, null, 2)}

SELL (en iyi 2):
${JSON.stringify(sell2, null, 2)}

İstenen rapor:
1) BUY-1 hisse bazlı detay (2-3 cümle) + skor band yorumu.
2) BUY-2 hisse bazlı detay (2-3 cümle) + skor band yorumu.
3) SELL tarafı: varsa en güçlü SELL'i detayla (2-3 cümle). Yoksa "SELL: aday yok" ve kısa gerekçe.
4) Genel piyasa duyarlılığı: BUY/SELL dengesini ve teyit ihtiyacını söyle.
5) Risk notu: volatilite, false signal, endeks teyidi, stop-plan uyarısı.

Skor bandı:
>=25 Güçlü, 18-24 Orta, <18 Zayıf.
Reasons'ı aynen kopyalama; ne anlama geldiğini teknik dille yorumla.
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text()?.trim() ?? "";

    // ✅ AI düzgün 5 madde döndüyse al, değilse deterministik
    const forced = forceFiveBullets(raw);

    return NextResponse.json({
      ok: true,
      commentary: forced ?? deterministicFallback(buy2, sell2),
    });
  } catch (e) {
    console.error("AI commentary error:", e);
    // hata olursa bile terminal bozulmasın
    return NextResponse.json({
      ok: true,
      commentary:
        "1) BUY – Analiz üretilemedi (sunucu hatası).\n" +
        "2) BUY – Analiz üretilemedi.\n" +
        "3) SELL – Analiz üretilemedi.\n" +
        "4) Genel Piyasa Görünümü: Sistem hatası, tekrar dene.\n" +
        "5) Risk Notu: Teyit beklenmeli.",
    });
  }
}