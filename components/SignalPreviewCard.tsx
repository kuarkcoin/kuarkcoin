import Link from "next/link";
import { formatSignalTime } from "@/lib/format-signal-time";
import { normalizeSignalIndicators } from "@/lib/normalize-signal-indicators";

type SignalPreviewCardRow = {
  id?: string | number | null;
  symbol?: string | null;
  signal?: string | null;
  price?: number | null;
  score?: number | null;
  reasons?: unknown;
  created_at?: string | null;
};

function symbolToPlain(sym: unknown) {
  return String(sym || "—").replace(/^[A-Z]+:/, "");
}

function formatPrice(n: number | null | undefined) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 }).format(n);
}

export function SignalPreviewCard({ row }: { row: SignalPreviewCardRow }) {
  const sig = String(row.signal ?? "").toUpperCase();
  const buy = sig === "BUY";
  const indicators = normalizeSignalIndicators(row.reasons);
  const visibleIndicators = indicators.slice(0, 2);
  const hiddenCount = Math.max(0, indicators.length - visibleIndicators.length);

  return (
    <Link href={`/terminal?focus=${encodeURIComponent(String(row.id ?? ""))}`} className="interactive-row rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-lg font-black">{symbolToPlain(row.symbol)}</div>
          <div className="text-xs text-slate-500">{formatSignalTime(row.created_at)}</div>
        </div>
        <span aria-label={`${buy ? "BUY" : sig === "SELL" ? "SELL" : "UNKNOWN"} signal`} className={`rounded-lg border px-2 py-1 text-xs font-black ${buy ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>
          {sig || "—"}
        </span>
      </div>
      <div className="mt-3 flex justify-between text-sm"><span>Fiyat <b>{formatPrice(row.price)}</b></span><span>Skor <b>{row.score ?? "—"}</b></span></div>
      {indicators.length > 0 ? <div className="mt-2 flex flex-wrap gap-1">{visibleIndicators.map((indicator) => <span key={indicator} className="rounded-md bg-slate-700/30 px-2 py-1 text-[11px] text-slate-300">{indicator}</span>)}{hiddenCount > 0 ? <span className="rounded-md bg-slate-700/30 px-2 py-1 text-[11px] text-slate-300">+{hiddenCount}</span> : null}</div> : null}
    </Link>
  );
}
