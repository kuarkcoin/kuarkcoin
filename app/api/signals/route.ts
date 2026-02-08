// app/api/signals/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Outcome = "WIN" | "LOSS" | null;
type SignalSide = "BUY" | "SELL";

type SignalItem = {
  id: number;
  symbol: string;
  side: SignalSide;
  tf: string;
  time: number;
  price: number | null;
  reasons: string | null;
};

function istanbulDayRange(date = new Date()) {
  const tzOffsetMs = 3 * 60 * 60 * 1000; // UTC+3
  const local = new Date(date.getTime() + tzOffsetMs);

  const startLocal = new Date(local);
  startLocal.setHours(0, 0, 0, 0);

  const endLocal = new Date(startLocal);
  endLocal.setDate(endLocal.getDate() + 1);

  const startUTC = new Date(startLocal.getTime() - tzOffsetMs);
  const endUTC = new Date(endLocal.getTime() - tzOffsetMs);

  return { startUTC, endUTC };
}

function noStore(json: any, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

function clampInt(val: string | null, fallback: number, min: number, max: number) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

// TradingView t bazen seconds bazen ms gelebilir
function parseTvTime(t: any) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  // 1e12 ~ 2001-09-09 in ms. bunun altı büyük ihtimal seconds
  return new Date(n < 1e12 ? n * 1000 : n);
}

// ✅ TradingView webhook'larda bazen header/JSON sıkıntısı olur.
// Bu helper hem JSON parse eder hem debug için raw parçasını döndürebilir.
async function readJsonBody(req: Request) {
  const raw = await req.text();
  let body: any = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  return { raw, body };
}

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const symbol = searchParams.get("symbol");
  const tf = searchParams.get("tf") || "1D";
  const days = clampInt(searchParams.get("days"), 120, 1, 365);

  if (scope === "todayTop") {
    const { startUTC, endUTC } = istanbulDayRange();

    const base = () =>
      supa
        .from("signals")
        .select("*")
        .gte("created_at", startUTC.toISOString())
        .lt("created_at", endUTC.toISOString())
        .not("score", "is", null);

    const { data: topBuy, error: e1 } = await base()
      .eq("signal", "BUY")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: topSell, error: e2 } = await base()
      .eq("signal", "SELL")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (e1 || e2) {
      return noStore(
        { ok: false, topBuy: [], topSell: [], error: (e1 ?? e2)?.message },
        { status: 500 }
      );
    }

    return noStore({ ok: true, topBuy: topBuy ?? [], topSell: topSell ?? [] });
  }

  if (symbol) {
    const from = new Date(Date.now() - days * 86400000);
    const { data, error } = await supa
      .from("signals")
      .select("*")
      .eq("symbol", symbol)
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: true })
      .limit(2000);

    if (error) return noStore({ ok: false, items: [], error: error.message }, { status: 500 });

    const items: SignalItem[] = (data ?? []).map((row: any) => ({
      id: Number(row.id),
      symbol: String(row.symbol ?? symbol),
      side: String(row.signal ?? "").toUpperCase() === "SELL" ? "SELL" : "BUY",
      tf: String(row.tf ?? tf),
      time: Math.floor(new Date(row.created_at).getTime() / 1000),
      price: row.price == null ? null : Number(row.price),
      reasons: row.reasons == null ? null : String(row.reasons),
    }));

    return noStore({ ok: true, items });
  }

  const { data, error } = await supa
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return noStore({ ok: false, data: [], error: error.message }, { status: 500 });
  return noStore({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const supa = supabaseServer();

  // ✅ RAW parse (TradingView ile en sağlam yöntem)
  const { raw, body } = await readJsonBody(req);
  if (!body) {
    return noStore(
      { ok: false, error: "Bad JSON", raw: raw.slice(0, 200) },
      { status: 400 }
    );
  }

  // ✅ Secret doğrulama
  if (body.secret !== process.env.SCAN_SECRET) {
    return noStore(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const symbol = String(body.symbol ?? "").trim();
  const signal = String(body.signal ?? "").toUpperCase().trim();
  const price = body.price == null ? null : Number(body.price);
  const score = body.score == null ? null : Number(body.score);
  const reasons = body.reasons == null ? null : String(body.reasons);
  const created_at = body.t ? parseTvTime(body.t) : new Date();

  if (!symbol || (signal !== "BUY" && signal !== "SELL")) {
    return noStore({ ok: false, error: "Missing symbol/signal" }, { status: 400 });
  }

  // NaN koruması
  const safePrice = typeof price === "number" && Number.isFinite(price) ? price : null;
  const safeScore = typeof score === "number" && Number.isFinite(score) ? score : null;

  const { data, error } = await supa
    .from("signals")
    .insert([{ symbol, signal, price: safePrice, score: safeScore, reasons, created_at }])
    .select("*")
    .single();

  if (error) return noStore({ ok: false, error: error.message }, { status: 500 });
  return noStore({ ok: true, data });
}

export async function PATCH(req: Request) {
  const supa = supabaseServer();

  // PATCH'te de aynı RAW parse (bazı clientlar header bozabiliyor)
  const { raw, body } = await readJsonBody(req);
  if (!body) {
    return noStore(
      { ok: false, error: "Bad JSON", raw: raw.slice(0, 200) },
      { status: 400 }
    );
  }

  const id = Number(body.id);
  const outcome: Outcome =
    body.outcome === "WIN" ? "WIN" : body.outcome === "LOSS" ? "LOSS" : null;

  if (!id) return noStore({ ok: false, error: "Missing id" }, { status: 400 });

  const { data, error } = await supa
    .from("signals")
    .update({ outcome })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return noStore({ ok: false, error: error.message }, { status: 500 });
  return noStore({ ok: true, data });
}
