import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getIstanbulDay } from "@/lib/istanbulDay";
import { getBusinessDayCutoff, isDayOnOrAfter } from "@/lib/businessDays";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SignalSide = "BUY" | "SELL";

type SignalRow = {
  created_at: string;
  symbol: string;
  signal: SignalSide;
  score: number;
  price: number | null;
};

type DailyTopItem = {
  symbol: string;
  score: number;
  close: number | null;
  close_10bd: number | null;
  pct_10bd: number | null;
};

type DailyTopRecord = {
  day: string;
  buy: DailyTopItem[];
  sell: DailyTopItem[];
  created_at: string;
};

const dailyTopPath = path.join(process.cwd(), "data", "daily-top.json");
const signalsPath = path.join(process.cwd(), "data", "signals.json");

let memoryDailyTopCache: DailyTopRecord[] = [];

function parseNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readSecretFromRequest(req: Request): string | null {
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret) return headerSecret;

  const url = new URL(req.url);
  return url.searchParams.get("secret");
}

function parseSignalDay(createdAt: string): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return getIstanbulDay(date);
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function readDailyTopRecords(): Promise<DailyTopRecord[]> {
  const fileData = await readJsonFile<DailyTopRecord[] | null>(dailyTopPath, null);
  if (Array.isArray(fileData)) {
    memoryDailyTopCache = fileData;
    return fileData;
  }
  return memoryDailyTopCache;
}

async function writeDailyTopRecords(records: DailyTopRecord[]) {
  memoryDailyTopCache = records;
  try {
    await fs.writeFile(dailyTopPath, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
    return { persistedToFile: true };
  } catch {
    // NOTE: Vercel serverless'ta dosya yazımı kalıcı olmayabilir veya tamamen başarısız olabilir.
    // Bu nedenle RAM üstünde fallback cache tutulur ve GET bu cache'i döndürür.
    return { persistedToFile: false };
  }
}

async function fetchCloseAnd10Bd(symbol: string): Promise<{ close: number | null; close_10bd: number | null }> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { close: null, close_10bd: null };

  const now = Math.floor(Date.now() / 1000);
  const from = now - 60 * 24 * 60 * 60;
  const params = new URLSearchParams({
    symbol,
    resolution: "D",
    from: String(from),
    to: String(now),
    token: apiKey,
  });

  const url = `https://finnhub.io/api/v1/stock/candle?${params.toString()}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { close: null, close_10bd: null };

    const json = await res.json();
    const closes = Array.isArray(json?.c)
      ? (json.c as unknown[]).map(parseNumber).filter((n): n is number => n !== null)
      : [];

    if (!closes.length) return { close: null, close_10bd: null };

    const close = closes[closes.length - 1] ?? null;
    const close10Idx = closes.length - 1 - 10;
    const close_10bd = close10Idx >= 0 ? closes[close10Idx] ?? null : null;

    return { close, close_10bd };
  } catch {
    return { close: null, close_10bd: null };
  }
}

function computePct(close: number | null, close10bd: number | null): number | null {
  if (close == null || close10bd == null || close10bd === 0) return null;
  return ((close / close10bd) - 1) * 100;
}

async function mapTopItems(signals: SignalRow[]): Promise<DailyTopItem[]> {
  return Promise.all(
    signals.map(async (row) => {
      const fetched = await fetchCloseAnd10Bd(row.symbol);
      const close = row.price ?? fetched.close;
      const close_10bd = fetched.close_10bd;
      return {
        symbol: row.symbol,
        score: row.score,
        close,
        close_10bd,
        pct_10bd: computePct(close, close_10bd),
      };
    })
  );
}

export async function GET() {
  const records = await readDailyTopRecords();
  return NextResponse.json(records, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const receivedSecret = readSecretFromRequest(req);

  if (!cronSecret || receivedSecret !== cronSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const day = getIstanbulDay();
  const allSignals = await readJsonFile<SignalRow[]>(signalsPath, []);

  const todaysSignals = allSignals.filter((row) => {
    if (!row?.created_at || !row?.symbol || !row?.signal) return false;
    const signalDay = parseSignalDay(row.created_at);
    const score = parseNumber(row.score);
    if (!signalDay || score === null) return false;
    return signalDay === day && (row.signal === "BUY" || row.signal === "SELL");
  });

  const topBuyRaw = todaysSignals
    .filter((row) => row.signal === "BUY")
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((row) => ({ ...row, score: Number(row.score), price: parseNumber(row.price) }));

  const topSellRaw = todaysSignals
    .filter((row) => row.signal === "SELL")
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((row) => ({ ...row, score: Number(row.score), price: parseNumber(row.price) }));

  const buy = await mapTopItems(topBuyRaw);
  const sell = await mapTopItems(topSellRaw);

  const records = await readDailyTopRecords();
  const newRecord: DailyTopRecord = {
    day,
    buy,
    sell,
    created_at: new Date().toISOString(),
  };

  const merged = records.some((record) => record.day === day)
    ? records.map((record) => (record.day === day ? newRecord : record))
    : [...records, newRecord];

  const cutoffDay = getBusinessDayCutoff(day, 10);
  const cleaned = merged
    .filter((record) => isDayOnOrAfter(record.day, cutoffDay))
    .sort((a, b) => b.day.localeCompare(a.day));

  const writeResult = await writeDailyTopRecords(cleaned);

  return NextResponse.json({
    ok: true,
    day,
    buyCount: buy.length,
    sellCount: sell.length,
    persistedToFile: writeResult.persistedToFile,
  });
}
