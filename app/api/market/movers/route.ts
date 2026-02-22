import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_UNIVERSE = ["BIST100", "NASDAQ300", "ETF"] as const;

type Universe = (typeof ALLOWED_UNIVERSE)[number];

function noStore(json: any, init?: ResponseInit) {
  return NextResponse.json(json, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

function istanbulDateYmd(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function plainSymbol(sym: string) {
  const s = sym.trim();
  const idx = s.indexOf(":");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const u = String(searchParams.get("u") ?? "BIST100").toUpperCase();
  const universe: Universe = (ALLOWED_UNIVERSE as readonly string[]).includes(u) ? (u as Universe) : "BIST100";
  const limitRaw = Number(searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 10;

  const supa = supabaseServer();
  const today = istanbulDateYmd();

  const { data, error } = await supa
    .from("daily_prices")
    .select("symbol,close,change_pct")
    .eq("date", today)
    .order("change_pct", { ascending: false, nullsFirst: false });

  if (error) return noStore({ ok: false, error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r: any) => ({
    symbol: plainSymbol(String(r.symbol ?? "")),
    price: typeof r.close === "number" ? r.close : Number(r.close),
    changePct: typeof r.change_pct === "number" ? r.change_pct : Number(r.change_pct),
  }));

  const clean = rows.filter((r) => r.symbol);
  const gainers = [...clean].sort((a, b) => (b.changePct || -999) - (a.changePct || -999)).slice(0, limit);
  const losers = [...clean].sort((a, b) => (a.changePct || 999) - (b.changePct || 999)).slice(0, limit);

  return noStore({ ok: true, universe, date: today, gainers, losers });
}
