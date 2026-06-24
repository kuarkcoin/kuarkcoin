import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/70 bg-slate-950 px-4 py-8 text-sm text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Kuarkcoin. İçerikler yatırım tavsiyesi değildir.</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/terms" className="hover:text-slate-100">Kullanım Koşulları</Link>
          <Link href="/privacy" className="hover:text-slate-100">Gizlilik Politikası</Link>
          <Link href="/risk-disclosure" className="hover:text-slate-100">Risk Bildirimi</Link>
          <a href="mailto:support@example.com" className="hover:text-slate-100">İletişim</a>
        </nav>
      </div>
    </footer>
  );
}
