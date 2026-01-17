import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // edge değil

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function toUnixSec(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

function dayStartUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = (searchParams.get('ticker') || '').trim().toUpperCase();
    if (!ticker) return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });

    const key = process.env.FINNHUB_API_KEY;
    if (!key) return NextResponse.json({ error: 'Missing FINNHUB_API_KEY' }, { status: 500 });

    // last 35 days buffer (weekends)
    const now = new Date();
    const fromDate = new Date(now.getTime() - 35 * 24 * 3600 * 1000);

    const from = toUnixSec(fromDate);
    const to = toUnixSec(now);

    // 1) company news
    const newsUrl =
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}` +
      `&from=${fromDate.toISOString().slice(0, 10)}&to=${now.toISOString().slice(0, 10)}&token=${key}`;

    const newsRes = await fetch(newsUrl, { next: { revalidate: 60 * 15 } }); // 15 min cache
    if (!newsRes.ok) throw new Error(`News fetch failed: ${newsRes.status}`);
    const newsRaw = (await newsRes.json()) as any[];

    // 2) daily candles (may 403 on free plan -> do NOT crash)
    const candlesUrl =
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}` +
      `&resolution=D&from=${from}&to=${to}&token=${key}`;

    let candles: any = null;
    try {
      const cRes = await fetch(candlesUrl, { next: { revalidate: 60 * 60 * 24 } }); // 1 day cache
      if (cRes.ok) candles = await cRes.json();
    } catch {
      candles = null;
    }

    const hasCandles =
      candles?.s === 'ok' &&
      Array.isArray(candles?.t) &&
      Array.isArray(candles?.c) &&
      candles.t.length >= 10 &&
      candles.c.length === candles.t.length;

    const tArr: number[] = hasCandles ? candles.t : [];
    const cArr: number[] = hasCandles ? candles.c : [];

    // month change (first vs last close)
    const monthChange =
      hasCandles && cArr.length >= 2 ? cArr[cArr.length - 1] / cArr[0] - 1 : null;

    // helper: find candle index for a news time (closest same day or next available)
    const findIndexForNewsTime = (newsTimeSec: number) => {
      if (!hasCandles) return -1;

      const d = dayStartUtc(new Date(newsTimeSec * 1000));
      const daySec = Math.floor(d.getTime() / 1000);

      // find first candle with t >= daySec
      let lo = 0,
        hi = tArr.length - 1,
        ans = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (tArr[mid] >= daySec) {
          ans = mid;
          hi = mid - 1;
        } else lo = mid + 1;
      }
      return ans;
    };

    const items = (newsRaw || [])
      .slice(0, 60)
      .map((n) => {
        const headline = String(n.headline || '');
        const time = Number(n.datetime || 0);
        const url = n.url ? String(n.url) : undefined;

        // default: no price metrics
        let ret1d: number | null = null;
        let ret5d: number | null = null;
        let strength: number | null = null;

        const idx = findIndexForNewsTime(time);
        if (hasCandles && idx >= 0 && idx < cArr.length) {
          const base = cArr[idx] || null;

          ret1d =
            idx + 1 < cArr.length && base ? cArr[idx + 1] / base - 1 : null;

          ret5d =
            idx + 5 < cArr.length && base ? cArr[idx + 5] / base - 1 : null;

          strength =
            typeof ret5d === 'number'
              ? clamp(Math.round(Math.abs(ret5d) * 1000), 0, 100)
              : null;
        }

        return { headline, time, url, ret1d, ret5d, strength };
      })
      .filter((x) => x.headline);

    return NextResponse.json({
      ticker,
      monthChange,
      candlesOk: hasCandles, // UI'da istersen uyarı basarsın
      items,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
