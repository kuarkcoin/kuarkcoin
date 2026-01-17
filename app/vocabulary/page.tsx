import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'İngilizce Kelime Dizini A-Z | EnglishMeter',
  description: 'YDS, YÖKDİL ve IELTS hazırlık için 4000+ kelimelik alfabetik sözlük ve çalışma rehberi.',
};

export default function VocabularyIndexPage() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-slate-900 mb-4 text-center">
          İngilizce Kelime Dizini
        </h1>
        <p className="text-slate-600 text-center mb-10 font-medium">
          4.000'den fazla akademik kelimeyi harf harf inceleyin ve örnek cümlelerle öğrenin.
        </p>

        {/* A-Z Navigasyon Kartları */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {alphabet.map((letter) => (
            <Link
              key={letter}
              href={`/vocabulary/letter/${letter.toLowerCase()}`}
              className="bg-white border-2 border-slate-200 rounded-2xl py-8 text-center hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100 transition-all group"
            >
              <span className="text-3xl font-black text-slate-700 group-hover:text-blue-600">
                {letter}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
