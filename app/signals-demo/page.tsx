import SignalsChart1D from "@/components/SignalsChart1D";

export default function SignalsDemoPage() {
  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-black">TradingView Sinyalleri • 1G Grafik</h1>
        <p className="mt-2 text-sm text-gray-400">
          Webhook BUY/SELL sinyallerini 1 günlük mum grafiğinde ve alt etiketlerde görüntüler.
        </p>
        <div className="mt-6">
          <SignalsChart1D symbol="BIST:ASELS" days={180} />
        </div>
      </div>
    </main>
  );
}
