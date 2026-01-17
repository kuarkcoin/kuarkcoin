// components/Footer.tsx
'use client';

import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-sm mt-10">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Sol Kısım: Marka */}
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-black text-lg tracking-tight text-slate-800">
                EnglishMeter
              </span>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Free Tests
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-md">
              Online English grammar tests, CEFR level quizzes (A1–C2) and quick
              placement exams to help you practise and track your progress.
            </p>
          </div>

          {/* Orta Kısım: Linkler (DÜZELTİLDİ) */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            
            {/* EKLENDİ: About Sayfası */}
            <Link href="/about" className="hover:text-slate-900 transition-colors">
              About Us
            </Link>

            <Link href="/race" className="hover:text-slate-900 transition-colors">
              Global Race
            </Link>
            
            <Link href="/levels/A1" className="hover:text-slate-900 transition-colors">
              Level Tests
            </Link>
            
            <Link href="/contact" className="hover:text-slate-900 transition-colors">
              Contact
            </Link>
            
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy
            </Link>
            
            {/* DÜZELTİLDİ: /cookies yerine /cookie (Dosya adınla aynı olmalı) */}
            <Link href="/cookie" className="hover:text-slate-900 transition-colors">
              Cookies
            </Link>
          </nav>

          {/* Sağ Kısım: Sosyal Medya */}
          <div className="flex flex-col items-start md:items-end gap-2">
            <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Follow
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="currentColor" d="M18.9 3H21l-4.6 5.2L21.8 21h-4.7l-3.3-7.1L9.5 21H3.2l4.9-5.7L2.2 3h4.9l3 6.6L18.9 3zM8.3 5.1H6.6l9.2 13.8h1.8L8.3 5.1z" />
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="currentColor" d="M13 22v-8h3l.5-4H13V7.2C13 6.1 13.3 5.5 15 5.5h1.7V2.1C16.3 2 15.3 2 14.3 2 11.6 2 9.7 3.7 9.7 6.9V10H7v4h2.7v8H13z" />
                </svg>
              </a>
              <a
                href="mailto:admin@englishmeter.net"
                aria-label="Email"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="currentColor" d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm0 2v.2l8 4.6 8-4.6V8l-8 4.6L4 8z" />
                </svg>
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              © {year} EnglishMeter. All rights reserved.
            </p>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-400 text-left md:text-center">
          This site uses cookies for basic analytics and performance. By using EnglishMeter
          you agree to the use of cookies.
        </div>
      </div>
    </footer>
  );
}
