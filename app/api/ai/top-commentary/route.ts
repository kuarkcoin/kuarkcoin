// src/app/api/ai/top-commentary/route.ts
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

// ✅ 1) Whitelist (AI'ya sadece bunlar gider)
const ALLOWED_REASON_KEYS = new Set([
  // BUY
  "BLUE_STAR",
  "RSI_DIV",
  "RSI_30",
  "MACD_BULL",
  "MA5_20_UP",
  "VWAP_UP",
  "VOL_BOOST",
  "GOLDEN_CROSS",
  "D1_CONFIRM",

  // SELL
  "RED_STAR",
  "RSI_70_DOWN",
  "MACD_BEAR",
  "MA5_20_DOWN",
  "VWAP_DOWN",
  "SELL_PRESSURE",
  "DEATH_CROSS",
]);

// Pine reasons -> UI reasons normalize
function normalizeReasonKey(raw: string) {
  const k = raw.split("(")[0].trim(); // BLUE_REV(+20) -> BLUE_REV

  const map: Record<string, string> = {
    // BUY
    BLUE_REV: "BLUE_STAR",
    RSI_BULLDIV3: "RSI_DIV",
    RSI30_OK: "RSI_30",
    MACD_OK: "MACD_BULL",
    "MA5/20_OK": "MA5_20_UP",
    VWAP_UP: "VWAP_UP",
    VOL_UP: "VOL_BOOST",
    GC_OK: "GOLDEN_CROSS",
    D1_CONFIRM: "D1_CONFIRM",

    // SELL
    TOP_REV: "RED_STAR",
    RSI_BEARDIV3: "RSI_DIV",
    RSI70_DN: "RSI_70_DOWN",
    MACD_DN: "MACD_BEAR",
    VWAP_DN: "VWAP_DOWN",
    "MA5/20_DN": "MA5_20_DOWN",
    BEAR_CANDLE: "SELL_PRESSURE",
    VOL_DUMP: "SELL_PRESSURE",
    DEATH_CROSS: "DEATH_CROSS",
  };

  return map[k] ?? k;
}

// ✅ 2) Prompt-injection’a kapalı reasons (raw metin yok)
function safeReasons(raw: string | null) {
  const arr = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeReasonKey)
    .filter((k) => ALLOWED_REASON_KEYS.has(k));

  // tekrarları kaldır + max 8
  return Array.from(new Set(arr)).slice(0, 8);
}

// ✅ 3) AI'ya gidecek "slim" veri (sadece gerekenler)
const slim = (rows: TopRow[]) =>
  rows.slice(0, 5).map((r) => ({
    symbol: String(r.symbol || "").trim(),
    price: r.price ?? null,
    score: r.score ?? null,
    reasons: safeReasons(r.reasons), // ✅ array (string değil)
    created_at: r.created_at ?? "",
  }));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topBuy: TopRow[] = Array.isArray(body?.topBuy) ? body.topBuy : [];
    const topSell: TopRow[] = Array.isArray(body?.topSell) ? body.topSell : [];

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "GEMINI_API_KEY yapılandırması eksik." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Model seçimi: 2.5-flash yoksa 2.0-flash'a düş
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `
Sen profesyonel bir trading terminal analistisin.
Sana verilen BUY ve SELL listelerini rasyonel bir şekilde, kesin konuşmadan ve yatırım tavsiyesi vermeden yorumlarsın.
Yanıtların tamamen Türkçe, 6-10 cümle arasında ve profesyonel bir tonda olmalıdır.
`,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 500,
      },
    });

    const prompt = `
Aşağıdaki Top 5 BUY ve Top 5 SELL verilerini analiz et.

### TOP BUY:
${JSON.stringify(slim(topBuy), null, 2)}

### TOP SELL:
${JSON.stringify(slim(topSell), null, 2)}

Analiz Yapısı (Zorunlu):
1) BUY tarafındaki 2-3 güçlü adayın (skoru yüksek olanlar) reasons etiketlerini özetle.
2) SELL tarafındaki 1-2 riskli adayın nedenlerini belirt.
3) "Bugünün genel resmi:" diye 1 cümlelik özet yaz.
4) En sık geçen reason etiketlerini BUY ve SELL için ayrı ayrı söyle.
5) Son cümlede risk notu ekle: (teyit ihtiyacı / false signal / volatilite) içinden uygun olan(lar).

Kurallar:
- Cevabını SADECE 5 madde olarak yaz (1..5). Hiçbir selamlama veya ekstra paragraf yok.
- Reasons alanı güvenli etiket listesidir; bunları birebir kopyalama, doğal Türkçe ile yorumla.
- Skor yorumu: 80+ çok güçlü, 60-79 orta, <60 zayıf/dikkat.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text()?.trim() ?? "";

    return NextResponse.json({
      ok: true,
      commentary: responseText || "Analiz oluşturulamadı.",
      model: modelName,
    });
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Sunucu tarafında hata oluştu." },
      { status: 500 }
    );
  }
}