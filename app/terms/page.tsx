import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

const sections = [
  {
    title: "Kullanım koşulları",
    body: "Kuarkcoin, piyasa verilerini, haberleri ve karar destek araçlarını genel bilgilendirme amacıyla sunar. Platformu kullanarak içeriklerin tek başına yatırım, alım-satım veya portföy yönetimi talimatı olmadığını kabul edersiniz.",
  },
  {
    title: "Kullanıcı sorumluluğu",
    body: "Kuarkcoin üzerinde yer alan sinyaller, analizler ve haber özetleri nihai karar yerine geçmez. Kullanıcılar kendi araştırmasını yapmak, risk iştahını değerlendirmek ve gerektiğinde bağımsız uzmanlardan destek almakla sorumludur.",
  },
  {
    title: "Veri ve erişim",
    body: "Piyasa verileri, üçüncü taraf kaynaklar ve teknik altyapı nedeniyle gecikmeli, eksik veya kesintili olabilir. Kuarkcoin, hizmetin her zaman hatasız veya kesintisiz çalışacağını taahhüt etmez.",
  },
  {
    title: "Değişiklikler",
    body: "Bu koşullar ürün, mevzuat veya operasyonel ihtiyaçlara göre güncellenebilir. Güncel metinlerin düzenli olarak kontrol edilmesi kullanıcının sorumluluğundadır.",
  },
];

export default function TermsPage() {
  return (
    <AppShell>
      <section className="space-y-6 p-4 md:p-6">
        <header className="app-card p-5 md:p-6">
          <Link href="/" className="text-sm font-bold text-sky-300 hover:text-sky-200">Genel bakışa dön</Link>
          <p className="section-label mt-5">Yasal bilgilendirme</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Kullanım Şartları</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Bu sayfa Kuarkcoin kullanımına ilişkin genel kuralları özetler. Hukuki uygunluk veya eksiksiz sözleşmesel koruma iddiası taşımaz; yalnızca genel bilgilendirme amaçlıdır.
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
