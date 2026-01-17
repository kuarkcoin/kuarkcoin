import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // sende nasılsa

function istanbulDayRange(date = new Date()) {
  // İstanbul: UTC+3 (kış/yaz yok, TR kalıcı)
  const tzOffsetMs = 3 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + tzOffsetMs);

  const startLocal = new Date(local);
  startLocal.setHours(0, 0, 0, 0);

  const endLocal = new Date(startLocal);
  endLocal.setDate(endLocal.getDate() + 1);

  // tekrar UTC’ye çevir
  const startUTC = new Date(startLocal.getTime() - tzOffsetMs);
  const endUTC = new Date(endLocal.getTime() - tzOffsetMs);

  return { startUTC, endUTC };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  // normal listeleme
  if (scope !== "todayTop") {
    const data = await prisma.signal.findMany({
      orderBy: { created_at: "desc" },
      take: 200,
    });
    return NextResponse.json({ data });
  }

  const { startUTC, endUTC } = istanbulDayRange();

  const baseWhere = {
    created_at: { gte: startUTC, lt: endUTC },
    score: { not: null },
  } as const;

  const topBuy = await prisma.signal.findMany({
    where: { ...baseWhere, signal: "BUY" },
    orderBy: [{ score: "desc" }, { created_at: "desc" }],
    take: 5,
  });

  const topSell = await prisma.signal.findMany({
    where: { ...baseWhere, signal: "SELL" },
    orderBy: [{ score: "desc" }, { created_at: "desc" }],
    take: 5,
  });

  return NextResponse.json({ topBuy, topSell });
}
