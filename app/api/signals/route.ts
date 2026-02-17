// app/api/signals/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;
type EventType = "OPEN" | "CLOSE";

function noStore(json: any, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

async function readJsonBody(req: Request) {
  const raw = await req.text();
  let body: any = null;
  try {
    body = JSON.parse(raw);
  } catch {
    // TradingView bazı kurulumlarda payload'ı string olarak kaçışlayıp yollayabiliyor
    // örn: "{\"secret\":\"...\"}" ya da "message={...}"
    try {
      const cleaned = raw.trim().replace(/^message=/i, "");
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        body = JSON.parse(JSON.parse(cleaned));
      } else {
        body = JSON.parse(cleaned);
      }
    } catch {
      body = null;
    }
  }
  return { raw, body };
}

function parseTvTime(t: any) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n < 1e12 ? n * 1000 : n);
}

function toBool(v: any) {
  if (v === true || v === false) return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return false;
}

function toNumOrNull(v: any) {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeStr(v: any) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function containsEMA50Retest(reasons: string | null) {
  if (!reasons) return false;
  const s = reasons.toLowerCase();
  return s.includes("ema50") && (s.includes("retest") || s.includes("rtest"));
}

// Secret doğrulama: ENV + body.secret + opsiyonel header
function getIncomingSecret(req: Request, body: any) {
  const headerSecret =
    req.headers.get("x-kuark-secret") ||
    req.headers.get("x-scan-secret") ||
    req.headers.get("x-secret");

  const bodySecret = body?.secret;
  return String(headerSecret ?? bodySecret ?? "").trim();
}

// "BINANCE:BTCUSDT" -> "BTCUSDT" (istersen)
function plainSymbol(sym: string) {
  const s = sym.trim();
  const idx = s.indexOf(":");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

// Sadece var olan alanları insert et (schema mismatch patlatmasın)
async function safeInsertSignal(supa: any, payload: any) {
  // signals tablonun kolonlarını bilmediğimiz için:
  // "common" alanları deniyoruz; hata verirse daha minimal dene.
  const try1 = await supa.from("signals").insert([payload]).select("id").single();
  if (!try1.error) return try1;

  // fallback: en minimal (çoğu şemada vardır)
  const minimal: any = {
    symbol: payload.symbol,
    signal: payload.signal,
    score: payload.score ?? null,
    reasons: payload.reasons ?? null,
    t_tv: payload.t_tv ?? new Date().toISOString(),
    timeframe: payload.timeframe ?? null,
    is_premium: payload.is_premium ?? false,
    grade: payload.grade ?? null,
  };

  const try2 = await supa.from("signals").insert([minimal]).select("id").single();
  return try2;
}

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "";

  if (scope === "top-buy-business-days") {
    const days = Number(searchParams.get("days") ?? "30");
    const d = Number.isFinite(days) ? Math.max(5, Math.min(days, 120)) : 30;

    const { data, error } = await supa
      .from("signals")
      .select("id,symbol,signal,score,price,created_at,t_tv,grade,is_premium")
      .eq("signal", "BUY")
      .not("score", "is", null)
      .order("score", { ascending: false })
      .limit(2500);

    if (error) return noStore({ ok: false, items: [], error: error.message }, { status: 500 });

    const now = Date.now();
    const since = now - d * 86400000;
    const dayMap = new Map<string, any>();

    for (const row of data ?? []) {
      const at = row.created_at ?? row.t_tv;
      const t = new Date(at).getTime();
      if (!Number.isFinite(t) || t < since) continue;

      const dayKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(t));

      const prev = dayMap.get(dayKey);
      const score = typeof row.score === "number" ? row.score : Number(row.score);
      if (!Number.isFinite(score)) continue;

      if (!prev || score > prev.score) {
        dayMap.set(dayKey, {
          id: row.id,
          day: dayKey,
          symbol: row.symbol,
          score,
          price: row.price ?? null,
          created_at: at,
          grade: row.grade ?? null,
          is_premium: Boolean(row.is_premium),
        });
      }
    }

    const isBusinessDay = (day: string) => {
      const dt = new Date(`${day}T12:00:00+03:00`);
      const wd = dt.getDay();
      return wd >= 1 && wd <= 5;
    };

    const items = Array.from(dayMap.values())
      .filter((x) => isBusinessDay(x.day))
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, d);

    return noStore({ ok: true, days: d, items, total: items.length });
  }

  if (scope === "stats") {
    const window = Number(searchParams.get("window") ?? "20");
    const w = Number.isFinite(window) ? Math.max(5, Math.min(window, 200)) : 20;

    const { data: trades, error } = await supa
      .from("trades")
      .select("outcome,is_ema50_retest,created_at")
      .not("outcome", "is", null)
      .order("created_at", { ascending: false })
      .limit(w);

    if (error) return noStore({ ok: false, error: error.message }, { status: 500 });

    const rows = trades ?? [];
    const total = rows.length;
    const wins = rows.filter((r: any) => r.outcome === "WIN").length;
    const winRate = total ? Math.round((wins / total) * 100) : 0;

    const emaRows = rows.filter((r: any) => r.is_ema50_retest);
    const emaTotal = emaRows.length;
    const emaWins = emaRows.filter((r: any) => r.outcome === "WIN").length;
    const emaWinRate = emaTotal ? Math.round((emaWins / emaTotal) * 100) : 0;

    return noStore({
      ok: true,
      window: w,
      total,
      wins,
      winRate,
      ema50: { total: emaTotal, wins: emaWins, winRate: emaWinRate },
    });
  }

  let { data, error } = await supa
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  // Bazı şemalarda created_at yerine t_tv var; fallback
  if (error && String(error.message || "").toLowerCase().includes("created_at")) {
    const fallback = await supa
      .from("signals")
      .select("*")
      .order("t_tv", { ascending: false })
      .limit(500);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return noStore({ ok: false, data: [], error: error.message }, { status: 500 });

  const normalized = (data ?? []).map((r: any) => ({
    ...r,
    created_at: r?.created_at ?? r?.t_tv ?? new Date().toISOString(),
  }));

  return noStore({ ok: true, data: normalized });
}

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { raw, body } = await readJsonBody(req);

  console.log("[/api/signals] RAW:", raw.slice(0, 1200));

  if (!body) return noStore({ ok: false, error: "Bad JSON", raw: raw.slice(0, 400) }, { status: 400 });

  // ✅ SECRET
  const expected = String(
    process.env.SCAN_SECRET ?? process.env.WEBHOOK_SECRET ?? process.env.KUARK_WEBHOOK_SECRET ?? ""
  ).trim();
  if (!expected) {
    return noStore(
      { ok: false, error: "Server misconfigured: SCAN_SECRET/WEBHOOK_SECRET missing" },
      { status: 500 }
    );
  }

  const incoming = getIncomingSecret(req, body);
  if (!incoming || incoming !== expected) {
    console.log("[/api/signals] UNAUTHORIZED incoming=", incoming?.slice(0, 24), "expected=", expected.slice(0, 24));
    return noStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // ✅ normalize payload
  const event: EventType = (String(body.event ?? body.type ?? "OPEN").toUpperCase() as EventType);
  const signal = String(body.signal ?? body.side ?? body.action ?? "").toUpperCase().trim();
  const symbolRaw = String(body.symbol ?? body.ticker ?? body.tickerid ?? "").trim();

  if (!symbolRaw) return noStore({ ok: false, error: "Missing symbol" }, { status: 400 });

  // TradingView bazen tickerid yolluyor: "NASDAQ:AAPL" / "BINANCE:BTCUSDT"
  const symbolPlain = plainSymbol(symbolRaw);

  const timeframe = normalizeStr(body.timeframe);
  const score = toNumOrNull(body.score);
  const grade = normalizeStr(body.grade);
  const premium = toBool(body.premium ?? body.is_premium);
  const reasons = normalizeStr(body.reasons);

  const t_tv = body.t ? parseTvTime(body.t) : new Date();

  const price = toNumOrNull(body.price);
  const entryPrice = toNumOrNull(body.entryPrice) ?? price;
  const exitPrice = toNumOrNull(body.exitPrice);

  // ✅ Eğer event OPEN ama signal yoksa: TV payload'ı bozuk demek
  if (event === "OPEN" && signal !== "BUY" && signal !== "SELL") {
    return noStore(
      { ok: false, error: "Missing/invalid signal for OPEN", got: { signal, symbol: symbolRaw } },
      { status: 400 }
    );
  }

  // 1) OPEN
  if (event === "OPEN") {
    // signals insert (schema tolerant)
    const signalPayload: any = {
      // Sende nasıl ise: symbol alanına raw yazıyorum; plain'i ayrı saklamak istersen ekle.
      symbol: symbolRaw,
      timeframe,
      signal,
      score,
      grade,
      is_premium: premium,
      reasons,
      t_tv: t_tv.toISOString(),

      // ⚠️ DB'de price kolonun yoksa try1 patlar; safeInsert fallback var.
      price,
      symbol_plain: symbolPlain, // DB'de yoksa sorun değil (fallback minimal deniyor)
    };

    const ins = await safeInsertSignal(supa, signalPayload);

    if (ins.error) {
      console.log("[/api/signals] signals insert error:", ins.error);
      return noStore(
        {
          ok: false,
          error: "signals insert failed",
          detail: ins.error.message,
          hint: "Muhtemel sebep: signals tablosu kolon uyuşmazlığı veya RLS (service role yok).",
        },
        { status: 500 }
      );
    }

    const signalId = ins.data?.id ?? null;

    // trades insert: tamamen opsiyonel (tablon yoksa vs. patlamasın)
    try {
      // açık trade varsa kapat
      await supa
        .from("trades")
        .update({ exit_time: t_tv.toISOString(), exit_reason: "NewSignalAutoClose" })
        .eq("symbol", symbolRaw)
        .is("exit_time", null);

      const direction = signal === "BUY" ? "LONG" : "SHORT";
      const isEma50 = containsEMA50Retest(reasons);

      const trIns = await supa
        .from("trades")
        .insert([
          {
            symbol: symbolRaw,
            timeframe,
            direction,
            entry_time: t_tv.toISOString(),
            entry_price: entryPrice,
            entry_signal_id: signalId,
            is_premium: premium,
            grade,
            score,
            reasons,
            is_ema50_retest: isEma50,
          },
        ])
        .select("id")
        .single();

      if (trIns.error) console.log("[/api/signals] trades insert warn:", trIns.error.message);
      return noStore({ ok: true, event: "OPEN", signalId, tradeId: trIns.data?.id ?? null });
    } catch (e: any) {
      console.log("[/api/signals] trades block warn:", e?.message ?? e);
      // signals kaydı başarıyla girdi, trade kısmı patlasa bile OK dönelim
      return noStore({ ok: true, event: "OPEN", signalId, tradeId: null, tradeWarn: true });
    }
  }

  // 2) CLOSE
  if (event === "CLOSE") {
    const outcome: Outcome = body.outcome === "WIN" ? "WIN" : body.outcome === "LOSS" ? "LOSS" : null;
    const exitReason = normalizeStr(body.exitReason);

    const { data: openTrade, error: eFind } = await supa
      .from("trades")
      .select("id, direction, entry_price")
      .eq("symbol", symbolRaw)
      .is("exit_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eFind) return noStore({ ok: false, error: eFind.message }, { status: 500 });
    if (!openTrade) return noStore({ ok: false, error: "No open trade for symbol" }, { status: 404 });

    let finalOutcome: Outcome = outcome;
    const ep = toNumOrNull(openTrade.entry_price);
    const xp = exitPrice;

    if (!finalOutcome && ep != null && xp != null) {
      if (openTrade.direction === "LONG") finalOutcome = xp > ep ? "WIN" : "LOSS";
      if (openTrade.direction === "SHORT") finalOutcome = xp < ep ? "WIN" : "LOSS";
    }

    const { data: closed, error: eClose } = await supa
      .from("trades")
      .update({
        exit_time: t_tv.toISOString(),
        exit_price: xp,
        outcome: finalOutcome,
        exit_reason: exitReason,
      })
      .eq("id", openTrade.id)
      .select("*")
      .single();

    if (eClose) return noStore({ ok: false, error: eClose.message }, { status: 500 });
    return noStore({ ok: true, event: "CLOSE", data: closed });
  }

  return noStore({ ok: false, error: "Invalid event" }, { status: 400 });
}
