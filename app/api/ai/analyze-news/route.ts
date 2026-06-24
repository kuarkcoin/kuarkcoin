import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { readJsonLimited, withTimeout } from "@/lib/http";
import { clampAiScore, cleanAiText, extractJsonObject, requireAiConfigAndRateLimit, safeImpact } from "@/lib/ai-security";

export const runtime = "nodejs";

type NewsItem = { headline?: unknown; summary?: unknown; source?: unknown };

function validate(body: any) {
  const symbol = cleanAiText(body?.symbol, 24).toUpperCase();
  const raw = Array.isArray(body?.newsItems) ? body.newsItems.slice(0, 12) : [];
  if (!symbol) return { ok: false as const, error: "symbol required" };
  const newsItems = raw.map((n: NewsItem) => ({ headline: cleanAiText(n?.headline, 180), summary: cleanAiText(n?.summary, 300), source: cleanAiText(n?.source, 40) })).filter((n: { headline: string }) => n.headline);
  return { ok: true as const, symbol, newsItems };
}

export async function POST(req: Request) {
  const limited = await readJsonLimited(req, 32 * 1024);
  if (!limited.ok) return NextResponse.json({ ok: false, error: limited.error }, { status: limited.status });
  const rate = await requireAiConfigAndRateLimit(req, "analyze-news", 20, 60);
  if (rate) return rate;
  const v = validate(limited.data);
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  if (!v.newsItems.length) return NextResponse.json({ ok: true, score: 0, explanation: "Haber bulunamadı.", impact: "LOW" });
  const timeout = withTimeout(12_000);
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY!;
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: modelName });
    const prompt = `Finans haberlerini ${v.symbol} için -10 ile +10 arasında puanla. Sadece JSON döndür: {"score":number,"explanation":"max 20 kelime Türkçe","impact":"HIGH|MEDIUM|LOW"}\nHaberler:\n${v.newsItems.map((n: { headline: string }, i: number) => `${i + 1}. ${n.headline}`).join("\n")}`;
    const result = await Promise.race([model.generateContent(prompt), new Promise<never>((_, rej) => timeout.signal.addEventListener("abort", () => rej(new Error("timeout"))))]);
    const raw = result.response.text();
    let parsed: any = {};
    try { parsed = JSON.parse(extractJsonObject(raw)); } catch { parsed = {}; }
    return NextResponse.json({ ok: true, score: clampAiScore(parsed?.score), impact: safeImpact(parsed?.impact), explanation: cleanAiText(parsed?.explanation || "Özet yok.", 200), model: modelName });
  } catch { return NextResponse.json({ ok: false, error: "Analiz başarısız." }, { status: 500 }); }
  finally { timeout.done(); }
}
