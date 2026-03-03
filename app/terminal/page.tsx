import dynamic from "next/dynamic";
import { headers } from "next/headers";
import type { Candle, Signal } from "@/app/components/KuarkLightChart";

const KuarkLightChart = dynamic(() => import("@/app/components/KuarkLightChart"), {
  ssr: false,
});

type SearchParams = {
  symbol?: string;
};

async function parseCandles(baseUrl: string, symbol: string): Promise<Candle[]> {
  const res = await fetch(
    `${baseUrl}/api/market/candles?symbol=${encodeURIComponent(symbol)}&tf=1D`,
    { cache: "no-store" },
  );

  if (!res.ok) return [];

  const json = await res.json();
  const raw = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];

  return raw
    .map((item: any) => ({
      time: Number(item?.time),
      open: Number(item?.open),
      high: Number(item?.high),
      low: Number(item?.low),
      close: Number(item?.close),
    }))
    .filter(
      (c: Candle) =>
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close),
    );
}

async function parseSignals(baseUrl: string, symbol: string): Promise<Signal[]> {
  const res = await fetch(`${baseUrl}/api/signals?symbol=${encodeURIComponent(symbol)}&limit=200`, {
    cache: "no-store",
  });

  if (!res.ok) return [];

  const json = await res.json();
  const raw = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

  return raw.map((item: any) => ({
    created_at: item?.created_at,
    time: typeof item?.time === "number" ? item.time : undefined,
    side: item?.side,
    signal: item?.signal,
    score: typeof item?.score === "number" ? item.score : undefined,
    price: typeof item?.price === "number" ? item.price : undefined,
  }));
}

function getBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function TerminalPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const symbol = (searchParams?.symbol || "BIMAS").toUpperCase();
  const baseUrl = getBaseUrl();

  const [candles, signals] = await Promise.all([parseCandles(baseUrl, symbol), parseSignals(baseUrl, symbol)]);

  return (
    <main className="min-h-screen bg-[#0d1117] p-4 md:p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-4">
        <h1 className="text-xl md:text-2xl font-semibold">KUARK Terminal • {symbol}</h1>
        <KuarkLightChart candles={candles} signals={signals} />
      </div>
    </main>
  );
}
