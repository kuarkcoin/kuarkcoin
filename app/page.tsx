import { headers } from "next/headers";

export const dynamic = "force-dynamic";

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

function formatNumber(value: number | null, maxFractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: maxFractionDigits }).format(value);
}

function getApiBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (envUrl) return envUrl;

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function getDailyTop(): Promise<DailyTopRecord[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/daily-top`, { cache: "no-store" });
  if (!res.ok) return [];

  const json = await res.json().catch(() => []);
  if (!Array.isArray(json)) return [];

  return json.slice(0, 10);
}

function SideTable({
  title,
  items,
  day,
}: {
  title: "BUY" | "SELL";
  items: DailyTopItem[];
  day: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className={`mb-3 text-sm font-semibold ${title === "BUY" ? "text-green-700" : "text-red-700"}`}>
        TOP 10 {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="py-2 pr-2">Symbol</th>
              <th className="py-2 pr-2">Score</th>
              <th className="py-2 pr-2">Close</th>
              <th className="py-2 pr-2">10İG %</th>
              <th className="py-2 pr-2">Day</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item) => (
                <tr key={`${title}-${item.symbol}`} className="border-b last:border-none">
                  <td className="py-2 pr-2 font-medium">{item.symbol}</td>
                  <td className="py-2 pr-2">{formatNumber(item.score, 0)}</td>
                  <td className="py-2 pr-2">{formatNumber(item.close, 4)}</td>
                  <td
                    className={`py-2 pr-2 font-medium ${
                      (item.pct_10bd ?? 0) > 0
                        ? "text-green-600"
                        : (item.pct_10bd ?? 0) < 0
                          ? "text-red-600"
                          : "text-gray-500"
                    }`}
                  >
                    {item.pct_10bd == null ? "—" : `${formatNumber(item.pct_10bd, 2)}%`}
                  </td>
                  <td className="py-2 pr-2 text-gray-500">{day}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-3 text-gray-500" colSpan={5}>
                  Veri yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function Page() {
  const days = await getDailyTop();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-6">
      <h1 className="mb-2 text-2xl font-bold">Günlük Top 10 BUY / SELL</h1>
      <p className="mb-6 text-sm text-gray-600">Son 10 iş gününe ait günlük kapanış sonrası skor sıralaması.</p>

      <div className="space-y-6">
        {days.length ? (
          days.map((dayBlock) => (
            <section key={dayBlock.day} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-6">
              <h2 className="mb-4 text-lg font-semibold">{dayBlock.day}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SideTable title="BUY" items={dayBlock.buy} day={dayBlock.day} />
                <SideTable title="SELL" items={dayBlock.sell} day={dayBlock.day} />
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-500">
            Henüz günlük liste üretilmedi.
          </div>
        )}
      </div>
    </main>
  );
}
