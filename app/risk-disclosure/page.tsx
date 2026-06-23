import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

const risks = [
  "Kuarkcoin yatırım danışmanlığı, portföy yönetimi veya kişiye özel finansal tavsiye sunmaz.",
  "Sinyaller ve analiz çıktıları kesin kazanç garantisi değildir; yalnızca karar destek ve genel bilgilendirme amacı taşır.",
  "Geçmiş performans, gelecekteki performansı veya olası getirileri garanti etmez.",
  "Kullanıcı, alım-satım dahil tüm finansal kararlarından ve bu kararların sonuçlarından kendisi sorumludur.",
  "Piyasa verilerinde gecikmeler, hatalar, eksiklikler, veri sağlayıcı kaynaklı sorunlar ve teknik kesintiler olabilir.",
  "Kripto varlıklar, hisse senetleri, ETF’ler ve diğer finansal ürünler yüksek volatilite, likidite ve sermaye kaybı riski taşıyabilir.",
];

export default function RiskDisclosurePage() {
  return (
    <AppShell>
      <section className="space-y-6 p-4 md:p-6">
        <header className="app-card border-amber-500/20 p-5 md:p-6">
          <Link href="/" className="text-sm font-bold text-sky-300 hover:text-sky-200">Genel bakışa dön</Link>
          <p className="section-label mt-5 text-amber-300">Risk bildirimi</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Risk Disclosure</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Bu sayfa yatırım ve piyasa araçlarının kullanımına ilişkin temel riskleri genel bilgilendirme amacıyla özetler. Kesin hukuki uygunluk iddiası içermez, hukuki veya finansal danışmanlık yerine geçmez.
          </p>
        </header>

        <section className="app-card p-5 md:p-6">
          <h2 className="text-xl font-black text-slate-50">Önemli riskler</h2>
          <ul className="mt-5 grid gap-3">
            {risks.map((risk) => (
              <li key={risk} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-slate-300">
                {risk}
              </li>
            ))}
          </ul>
        </section>

        <aside className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Kuarkcoin üzerindeki bilgiler kendi başına işlem yapma çağrısı değildir. Karar vermeden önce finansal durumunuzu, risk toleransınızı ve ilgili ürünün özelliklerini bağımsız olarak değerlendirmeniz önerilir.
        </aside>
      </section>
    </AppShell>
  );
}
