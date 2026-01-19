"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-gray-800 bg-[#161b22] p-6">
        <div className="text-sm font-bold uppercase tracking-widest text-red-300">
          Terminal Hatası
        </div>

        <div className="mt-2 text-gray-200 text-sm leading-relaxed">
          Sayfa beklenmeyen bir hata verdi. Yeniden dene.
        </div>

        <div className="mt-4 text-xs text-gray-500 font-mono break-words">
          {error?.message || "Unknown error"}
        </div>

        <button
          onClick={reset}
          className="mt-5 w-full text-sm font-semibold px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}