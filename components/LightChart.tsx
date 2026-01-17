"use client";

type Signal = {
  id: number;
  symbol: string;
  signal: string;
  price: number | null;
  created_at: string;
};

type Props = {
  symbol: string;
  signals: Signal[];
  resolution?: string;
  days?: number;
  selectedSignalId?: number | null;
};

export default function LightChart({
  symbol,
  signals,
}: Props) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="text-lg font-bold">{symbol}</div>
        <div className="text-sm opacity-70 mt-2">
          LightChart hazır (placeholder)
        </div>
        <div className="text-xs opacity-50 mt-1">
          Sinyal sayısı: {signals?.length ?? 0}
        </div>
      </div>
    </div>
  );
}