// app/api/speaking/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SpeakingRequest = {
  scenario: string;
  npc_line: string;
  user_said: string;
  level?: "A1" | "A2" | "B1" | "B2" | "C1";
};

type SpeakingResponse = {
  understood: boolean;
  meaning_score: number;     // 0-100
  fluency_score: number;     // 0-100
  grammar_fixes: string[];
  natural_reply: string;
  next_npc_line: string;
  notes: string;
};

function getRandomKey() {
  const keys = [
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_KEY_2,
    process.env.GOOGLE_KEY_3,
    process.env.GOOGLE_KEY_4,
    process.env.GOOGLE_KEY_5,
  ].filter(Boolean) as string[];
  return keys.length ? keys[Math.floor(Math.random() * keys.length)] : null;
}

// JSON’u metnin içinden “{ ... }” olarak çekip parse et (en sağlam yöntem)
function extractJsonObject(text: string): any | null {
  if (!text) return null;

  // Markdown fence temizle
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  // İlk { ile son } arasını dene
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  const candidate = clean.slice(first, last + 1);

  try {
    return JSON.parse(candidate);
  } catch {
    // Bazen model tek tırnak/son virgül vs. yapar; burada çok agressive “repair” yapmıyoruz.
    return null;
  }
}

// Saçmalama / boş konuşma gibi durumları AI’ye gitmeden yakala
function quickHeuristic(user_said: string) {
  const t = user_said.trim();

  if (t.length < 3) return { ok: false, reason: "too_short" };

  // harf oranı düşükse (random karakter/emoji/boşluk vs.)
  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  const ratio = letters / Math.max(1, t.length);

  if (ratio < 0.35) return { ok: false, reason: "not_english_like" };

  return { ok: true, reason: "ok" };
}

function clamp01to100(x: any, fallback: number) {
  const n = Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function POST(req: Request) {
  try {
    const apiKey = getRandomKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key missing" }, { status: 500 });
    }

    const body = (await req.json()) as SpeakingRequest;

    const scenario = (body.scenario || "").slice(0, 80);
    const npc_line = (body.npc_line || "").slice(0, 240);
    const user_said = (body.user_said || "").slice(0, 500);
    const level = body.level ?? "B1";

    if (!scenario || !npc_line || !user_said) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // ✅ saçmalama durumlarını burada yakala (AI’ye bile gitmesin)
    const h = quickHeuristic(user_said);
    if (!h.ok) {
      const resp: SpeakingResponse = {
        understood: false,
        meaning_score: 10,
        fluency_score: 10,
        grammar_fixes: ["Try a simple sentence.", "Speak clearly and use real words."],
        natural_reply: "Sorry—can you repeat that?",
        next_npc_line: npc_line, // aynı soruyu tekrar sor
        notes: "No worries—try again with a short clear answer.",
      };
      return NextResponse.json(resp);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 300,
        // ✅ EN KRİTİK: JSON formatını mime type ile zorla
        // (SDK destekliyorsa çıktı daha stabil JSON geliyor)
        responseMimeType: "application/json",
      } as any,
    });

    const prompt = `
Return ONLY valid JSON. No markdown. No extra text.

You are a friendly English speaking coach for everyday conversation.

Scenario: ${scenario}
NPC said: "${npc_line}"
Learner level: ${level}
User said (transcript): "${user_said}"

If the user's message is irrelevant or nonsensical for the scenario, set understood=false and give low scores (0-35),
ask a simpler question in next_npc_line, and provide a simple natural_reply the user can say.

Otherwise:
- meaning_score: 0-100
- fluency_score: 0-100
- grammar_fixes: max 3 items
- natural_reply: 1 sentence (better version of what user meant)
- next_npc_line: continue the same scenario naturally (1 sentence)
- notes: 1 short supportive sentence

JSON schema:
{
  "understood": boolean,
  "meaning_score": number,
  "fluency_score": number,
  "grammar_fixes": string[],
  "natural_reply": string,
  "next_npc_line": string,
  "notes": string
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 1) doğrudan parse (mime type sayesinde çoğu zaman bu olur)
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // 2) metinden JSON objesini çekmeyi dene
      parsed = extractJsonObject(text);
    }

    if (!parsed) {
      // ❗ Artık “70/65 sabit” yerine daha gerçekçi “anlamadım” fallback’i veriyoruz
      const resp: SpeakingResponse = {
        understood: false,
        meaning_score: 25,
        fluency_score: 25,
        grammar_fixes: ["Try again with a short sentence.", "Use simple words."],
        natural_reply: "Could you say that again, please?",
        next_npc_line: npc_line,
        notes: "I couldn’t parse the feedback—try once more.",
      };
      return NextResponse.json(resp);
    }

    const out: SpeakingResponse = {
      understood: Boolean(parsed.understood),
      meaning_score: clamp01to100(parsed.meaning_score, 50),
      fluency_score: clamp01to100(parsed.fluency_score, 50),
      grammar_fixes: Array.isArray(parsed.grammar_fixes) ? parsed.grammar_fixes.slice(0, 3) : [],
      natural_reply: String(parsed.natural_reply ?? user_said).slice(0, 220),
      next_npc_line: String(parsed.next_npc_line ?? npc_line).slice(0, 220),
      notes: String(parsed.notes ?? "Nice!").slice(0, 180),
    };

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
