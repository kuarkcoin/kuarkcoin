import React from 'react';
import Link from 'next/link';
import vocab1 from '@/data/yds_vocabulary.json';
import vocab2 from '@/data/yds_vocabulary1.json';

// Veriyi birleştirip tekilleştirme fonksiyonu
function getUniqueVocab() {
  const combined = [...vocab1, ...vocab2];
  const uniqueMap = new Map();
  combined.forEach((item: any) => {
    if (item?.word) uniqueMap.set(item.word.toLowerCase().trim(), item);
  });
  return Array.from(uniqueMap.values());
}

export async function generateStaticParams() {
  return "abcdefghijklmnopqrstuvwxyz".split("").map((letter) => ({
    letter: letter,
  }));
}

export default function LetterDetailPage({ params }: { params: { letter: string } }) {
  const letter = params.letter.toLowerCase();
  const allVocab = getUniqueVocab();
  
  // Harfe göre filtrele
  const filteredWords = allVocab
    .filter((v: any) => v.word.toLowerCase().startsWith(letter))
    .sort((a: any, b: any) => a.word.localeCompare(b.word));

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/vocabulary" className="text-blue-600 font-bold hover:underline">
            ← Tüm Harfler
          </Link>
          <h1 className="text-5xl font-black text-slate-900 mt-4 uppercase">
             "{letter}" Harfi ile Başlayan Kelimeler
          </h1>
          <p className="text-slate-500 mt-2">{filteredWords.length} kelime bulundu.</p>
        </div>

        {/* Kelime Linkleri Bulutu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
          {filteredWords.map((item: any) => {
            const slug = item.word.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            return (
              <Link
                key={slug}
                href={`/vocabulary/${slug}`}
                className="text-slate-700 hover:text-blue-600 font-medium border-b border-slate-100 py-1 transition-colors"
              >
                {item.word}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
