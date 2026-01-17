import React from 'react';
import Link from 'next/link';
import dailyEnAr from '@/data/daily_en_ar.json';

// ... üstte importlar aynı kalsın

type DailyItem = {
  word?: unknown;
  meaning?: unknown;
  s?: unknown;
  t?: unknown;
};

const safeStr = (v: unknown) => String(v ?? "").trim();

export default function ArabicHubPage() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // ✅ JSON'u temizle / normalize et
  const cleaned = (dailyEnAr as DailyItem[])
    .map((x) => ({
      word: safeStr(x?.word),
      meaning: safeStr(x?.meaning),
      s: safeStr(x?.s),
      t: safeStr(x?.t),
    }))
    .filter((x) => x.word.length > 0); // word boşsa at

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4 font-sans" dir="rtl">
      {/* ... senin UI aynen */}
      <div className="space-y-16">
        {alphabet.map((letter) => {
          const words = cleaned.filter((w) =>
            w.word.toUpperCase().startsWith(letter)
          );
          if (words.length === 0) return null;

          return (
            <section key={letter} id={`letter-${letter}`} className="scroll-mt-10">
              {/* ... */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {words.map((w, idx) => {
                  const slug = w.word.toLowerCase().replace(/\s+/g, "-");

                  return (
                    <Link
                      key={`${slug}-${idx}`}
                      href={`/ar/vocabulary/${slug}`}
                      className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-500 hover:shadow-lg transition-all"
                    >
                      <span className="font-bold text-slate-800 text-lg group-hover:text-emerald-600">
                        {w.word}
                      </span>
                      <span className="text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-lg">
                        {w.meaning || "—"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}