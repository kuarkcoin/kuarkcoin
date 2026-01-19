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
    .slice(0, 500);
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

// deterministik varyasyon: her sembol aynı cümleyi seçer ama semboller farklılaşır
function stablePick(key: string, arr: string[]) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

function confirmLine(symbol: string) {
  return stablePick(symbol + "|confirm", [
    "Teyit için kapanış gücü ve devam barları izlenmeli",
    "Teyit adına takip eden 1-2 kapanış belirleyici olur",
    "Teyit için trendin bozulmaması ve hacmin sönmemesi önemli",
    "Teyit için destek/direnç çevresindeki kapanış davranışı kritik",
  ]);
}

function riskLine(symbol: string) {
  return stablePick(symbol + "|risk", [
    "Zayıflama kalıcı olursa düzeltme derinleşebilir; risk yönetimi şart",
    "Volatilite artarsa false sinyal ihtimali yükselir; stop/plan önemli",
    "Sinyal bozulursa geri çekilme hızlanabilir; teyit arayın",
    "Haber akışı ve sert spread hareketleri riski artırabilir; temkinli olun",
  ]);
}

function mapReasonsToTech(reasons: string, symbol: string) {
  const r = (reasons || "").toLowerCase();
  const out: string[] = [];

  if (r.includes("macd")) {
    out.push(
      stablePick(symbol + "|macd", [
        "MACD tarafında dönüş izi var; momentum yukarı çevirmeyi deniyor",
        "MACD kesişim/dönüş etkisi, kısa vadede yön değişimi olasılığını artırıyor",
        "MACD momentumu toparlıyor; hareketin kalitesi takip eden barlarda netleşir",
      ])
    );
  }

  if (r.includes("vwap üst")) {
    out.push(
      stablePick(symbol + "|vwapU", [
        "VWAP üzerinde tutunma, alıcıların oyunda kaldığını gösteriyor",
        "VWAP üstü fiyatlama trend tarafını destekliyor; geri test izlenebilir",
        "VWAP üstü kalıcılık, dipten dönüş senaryosunu güçlendirebilir",
      ])
    );
  }

  if (r.includes("vwap alt")) {
    out.push(
      stablePick(symbol + "|vwapD", [
        "VWAP altında kalma, güç kaybına işaret edebilir; tepki yükselişi satış yiyebilir",
        "VWAP altı, zayıflama senaryosunu öne çıkarır; toparlanma teyit ister",
        "VWAP altı fiyatlama sürerse momentum zayıf kalabilir",
      ])
    );
  }

  if (r.includes("hacim")) {
    out.push(
      stablePick(symbol + "|vol", [
        "Hacim davranışı katılımı destekliyor; sürdürülebilirlik kritik",
        "İşlem hacmi tarafında canlılık var; tek barlık patlamaya güvenme",
        "Hacim eşliği varsa sinyalin kalitesi artar; kapanışlarla teyit aranmalı",
      ])
    );
  }

  if (r.includes("günlük onay") || r.includes("daily") || r.includes("1d")) {
    out.push(
      stablePick(symbol + "|mtf", [
        "Günlük zaman diliminden teyit gelirse sinyalin güvenilirliği artar",
        "MTF teyidi varsa hareketin devam etme ihtimali yükselir",
      ])
    );
  }

  if (r.includes("satış baskısı") || r.includes("dağıtım")) {
    out.push(
      stablePick(symbol + "|sellp", [
        "Satış baskısı/dağıtım izleri varsa yükselişler zayıf kalabilir",
        "Dağıtım ihtimali artıyorsa tepki hareketleri kısa sürebilir",
        "Satış baskısı devam ederse destek seviyeleri hızlı test edilebilir",
      ])
    );
  }

  if (r.includes("rsi")) {
    out.push(
      stablePick(symbol + "|rsi", [
        "RSI aşırı bölgeye yakınsa momentum yorgunluğu oluşabilir",
        "RSI tarafı gerilimli; zayıflama kalıcı olursa düzeltme sertleşebilir",
        "RSI’da aşırılık/soğuma sinyali varsa geri çekilme olasılığı artar",
      ])
    );
  }

  if (out.length === 0) {
    out.push(
      stablePick(symbol + "|gen", [
        "Sinyal, momentum ve trend teyidi ekseninde okunmalı; kapanış davranışı belirleyici",
        "Genel görünüm toparlanma denemesi; teyit için trend devamlılığına bakılmalı",
        "Kısa vade yön arayışı var; sinyalin kalitesi takip eden barlarda netleşir",
      ])
    );
  }

  // 2 cümle yeter
  return out.slice(0, 2).join(". ") + ".";
}

function pickTop2(rows: TopRow[]) {
  return [...rows]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 2)
    .map((r) => ({
      symbol: toPrettySymbol(r.symbol),
      score: r.score ?? 0,
      reasons: cleanReasons(r.reasons),
      price: r.price ?? null,
    }));
}

// ✅ AI ne dönerse dönsün: 5 maddeyi çekmeye çalış
function forceFiveBullets(text?: string | null) {
  if (!text) return null;

  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/#+\s?/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .trim();

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const bullets = lines.filter((l) => /^[1-5][\)\.\]]\s*/.test(l));
  if (bullets.length >= 5) return bullets.slice(0, 5).join("\n");

  // bazen model tek paragraf döner; 1) 2) 3) ile bölmeyi dene
  const parts = cleaned
    .split(/(?=[1-5][\)\.\]]\s*)/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const partsOk = parts.filter((p) => /^[1-5][\)\.\]]\s*/.test(p));
  if (partsOk.length >= 5) return partsOk.slice(0, 5).join("\n");

  return null;
}

// ✅ Kesin 5 madde (AI patlarsa bile) - EZBERİ KIRAN versiyon
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
    const tech = mapReasonsToTech(x.reasons || "", x.symbol);
    const conf = confirmLine(x.symbol);
    const px =
      x.price != null && Number.isFinite(x.price)
        ? ` Fiyat: ${Number(x.price).toFixed(2)}.`
        : "";
    return `${x.symbol} (Skor: ${x.score} • ${scoreBand(x.score)}). ${tech}${px} ${conf}.`;
  };

  const sellText = (x?: typeof s1) => {
    if (!x) return "Aday yok (bugün güçlü bozulma/risk etiketleri öne çıkmıyor).";
    const tech = mapReasonsToTech(x.reasons || "", x.symbol);
    const rline = riskLine(x.symbol);
    const px =
      x.price != null && Number.isFinite(x.price)
        ? ` Fiyat: ${Number(x.price).toFixed(2)}.`
        : "";
    return `${x.symbol} (Skor: ${x.score} • ${scoreBand(x.score)}). ${tech}${px} ${rline}.`;
  };

  const m1 = `1) BUY – ${buyText(b1)}`;
  const m2 = `2) BUY – ${buyText(b2)}`;

  const m3 =
    sell2.length > 0
      ? `3) SELL – ${sellText(s1)}${s2 ? " İkinci aday: " + sellText(s2) : ""}`
      : `3) SELL – ${sellText(undefined)}`;

  const m4 = stablePick("m4|" + (b1?.symbol ?? "") + "|" + (s1?.symbol ?? ""), [
    `4) Genel Piyasa Görünümü: BUY tarafı ${
      buy2.length ? "daha etkin görünüyor" : "zayıf"
    }, SELL tarafı ${
      sell2.length ? "risk uyarısı veriyor" : "sınırlı"
    }. Endeks yönü ve hacim teyidi kritik.`,
    `4) Genel Piyasa Görünümü: Denge ${
      buy2.length && sell2.length ? "karışık" : buy2.length ? "BUY ağırlıklı" : "temkinli"
    }. Teyit için endeks davranışı ve gün içi volatilite izlenmeli.`,
    `4) Genel Piyasa Görünümü: Sinyaller ${
      buy2.length ? "alım yönlü fırsat arıyor" : "zayıf"
    }, ancak ${
      sell2.length ? "risk etiketleri de var" : "satış baskısı sınırlı"
    }. Onay gelmeden agresifleşmemek daha sağlıklı.`,
  ]);

  const m5 = stablePick("m5|" + (b2?.symbol ?? ""), [
    "5) Risk Notu: False sinyal, volatilite ve haber akışı riski; tek göstergeye dayanma, stop/plan şart.",
    "5) Risk Notu: Piyasa rejimi (trend/yatay) değişirse sinyaller bozulabilir; pozisyon boyutu ve stop yönetimi önemli.",
    "5) Risk Notu: Kırılım/tutunma teyidi gelmeden işlem açmak riskli; endeks yönü ve hacim teyidine dikkat.",
  ]);

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
Aynı kalıp cümleyi tekrar etme; farklı ifade kullan.
Kesin konuşma, yatırım tavsiyesi verme.
`,
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 700,
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
3) SELL tarafı: varsa en güçlü SELL'i detayla (2-3 cümle). Varsa ikinci adayı tek cümleyle ekle. Yoksa "SELL: aday yok" + kısa gerekçe.
4) Genel piyasa duyarlılığı: BUY/SELL dengesini ve teyit ihtiyacını söyle.
5) Risk notu: volatilite, false signal, haber akışı, endeks teyidi, stop/plan uyarısı.

Skor bandı:
>=25 Güçlü, 18-24 Orta, <18 Zayıf.
Reasons'ı aynen kopyalama; ne anlama geldiğini teknik dille yorumla.
Her maddede aynı cümleyi tekrar etme.
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