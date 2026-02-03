// app/api/news/combined/route.ts
import { NextResponse } from "next/server";
import { scoreNews } from "@/lib/scoreNews";
import { NASDAQ300, ETFS, BIST100 } from "@/constants/universe";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const u = (searchParams.get("u") || "BIST100").toUpperCase();
  const limit = Number(searchParams.get("limit") || 12);

  // 👉 burada senin gerçek haber kaynağın olacak
  const rawNews = await fetchExternalNewsSomehow(u);

  const scored = rawNews
    .map((n: any) => {
      const r = scoreNews(n);
      return { ...n, score: r.score, level: r.level };
    })
    .filter(n => n.score >= 60) // 🔥 EŞİK
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json({
    universe: u,
    minScore: 60,
    items: scored,
  });
}

// 🔧 örnek placeholder
async function fetchExternalNewsSomehow(u: string) {
  // burada Finnhub / NewsAPI / kendi scraper'ın
  return [];
}