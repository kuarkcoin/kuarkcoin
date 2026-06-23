import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

const sections = [
  {
    title: "Toplanan bilgiler",
    body: "Kuarkcoin, hizmetin çalışması için gerekli teknik günlükler, kullanım verileri ve kullanıcı tarafından sağlanan bilgileri işleyebilir. Toplanan veriler ürün güvenliği, performans ve destek süreçleri için kullanılabilir.",
  },
  {
    title: "Çerezler ve analitik",
    body: "Platform deneyimini iyileştirmek, oturum güvenliğini sağlamak ve genel kullanım eğilimlerini anlamak için çerezler veya benzer teknolojiler kullanılabilir.",
  },
  {
    title: "Üçüncü taraf kaynaklar",
    body: "Piyasa verileri, haberler, finansal göstergeler ve benzeri içerikler üçüncü taraf servislerden alınabilir. Bu servislerin kendi gizlilik ve kullanım koşulları bulunabilir.",
  },
  {
    title: "Veri güvenliği",
    body: "Makul teknik ve idari önlemler uygulanır; ancak internet üzerinden yapılan hiçbir aktarımın tamamen risksiz olduğu garanti edilemez.",
  },
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <section className="space-y-6 p-4 md:p-6">
        <header className="app-card p-5 md:p-6">
          <Link href="/" className="text-sm font-bold text-sky-300 hover:text-sky-200">Genel bakışa dön</Link>
          <p className="section-label mt-5">Yasal bilgilendirme</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Gizlilik Politikası</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Bu metin Kuarkcoin’in veri işleme yaklaşımını genel hatlarıyla açıklar. Kesin hukuki uygunluk iddiası içermez ve hukuki tavsiye yerine geçmez.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="app-card p-5">
              <h2 className="text-lg font-black text-slate-50">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
