import { NextResponse } from "next/server";
// import { db } from "@/lib/db"; // Prisma/Supabase neyse

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { secret, symbol, price, signal, score, reasons } = body ?? {};

    if (!secret || secret !== process.env.SCAN_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!symbol || !signal) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // ✅ DB insert örneği (Prisma)
    // await db.signal.create({
    //   data: {
    //     symbol: String(symbol),
    //     signal: String(signal).toUpperCase(),
    //     price: price != null ? Number(price) : null,
    //     score: score != null ? Number(score) : null,
    //     reasons: reasons != null ? String(reasons) : null,
    //   },
    // });

    console.log("TV_WEBHOOK:", { symbol, signal, price, score, reasons });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}