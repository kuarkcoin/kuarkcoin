import React, { cache } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import vocab1 from '@/data/yds_vocabulary.json';
import vocab2 from '@/data/yds_vocabulary1.json';
import VocabularyQuiz from '@/components/VocabularyQuiz'; // Daha önce oluşturduğumuz bileşen
import WordAudioButton from '@/components/WordAudioButton'; // Ses için küçük bir client component

// 1. PERFORMANS OPTİMİZASYONU: Veriyi cache'liyoruz
const getUniqueVocabMap = cache(() => {
  const combined = [...vocab1, ...vocab2];
  const uniqueMap = new Map();

  combined.forEach((item: any) => {
    if (item && item.word) {
      const slug = item.word
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      if (!uniqueMap.has(slug)) {
        uniqueMap.set(slug, item);
      }
    }
  });
  return uniqueMap;
});

// 2. DİNAMİK METADATA
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const vocabMap = getUniqueVocabMap();
  const item = vocabMap.get(params.slug);

  if (!item) return { title: 'Kelime Bulunamadı | EnglishMeter' };

  return {
    title: `${item.word} Ne Demek? Anlamı ve Cümle Çevirisi | EnglishMeter`,
    description: `${item.word} kelimesinin Türkçe anlamı: ${item.meaning}. YDS, YÖKDİL ve akademik sınavlar için örnek cümleler.`,
    alternates: {
      canonical: `https://englishmeter.net/vocabulary/${params.slug}`,
    }
  };
}

export async function generateStaticParams() {
  const vocabMap = getUniqueVocabMap();
  return Array.from(vocabMap.keys()).map((slug) => ({ slug }));
}

export default function VocabularyDetailPage({ params }: { params: { slug: string } }) {
  const vocabMap = getUniqueVocabMap();
  const item = vocabMap.get(params.slug);

  if (!item) notFound();

  // Test için tüm anlamlardan havuz oluştur
  const allMeanings = Array.from(vocabMap.values()).map((v: any) => v.meaning);
  
  // Google Botları için "İç Linkleme": Rastgele 5 kelime seç
  const allSlugs = Array.from(vocabMap.keys());
  const relatedSlugs = allSlugs.sort(() => 0.5 - Math.random()).slice(0, 6);

  // Geliştirilmiş JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": item.word,
    "description": `${item.word} kelimesinin anlamı: ${item.meaning}`,
    "inDefinedTermSet": {
      "@type": "DefinedTermSet",
      "name": "EnglishMeter Akademik Kelime Sözlüğü",
      "url": "https://englishmeter.net/vocabulary"
    },
    "url": `https://englishmeter.net/vocabulary/${params.slug}`
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/vocabulary" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
            ← Kelime Dizini
          </Link>
          <span className="text-xs text-slate-400 font-medium">YDS Hazırlık / Akademik</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-black mb-2 flex items-center gap-4">
                {item.word}
                <WordAudioButton word={item.word} /> 
              </h1>
              <p className="text-slate-400 font-bold uppercase tracking-tighter text-sm">Kelime Detayı ve Telaffuzu</p>
            </div>
          </div>

          <div className="p-8 space-y-10">
            {/* Anlam */}
            <section>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Türkçe Karşılığı</h2>
              <p className="text-4xl font-bold text-slate-800 leading-tight">
                {item.meaning}
              </p>
            </section>

            {/* Örnek Cümle */}
            {(item.s || item.sentence) && (
              <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Örnek Cümle İçinde Kullanımı</h2>
                <p className="text-xl text-blue-900 font-medium italic leading-relaxed">
                  "{item.s || item.sentence}"
                </p>
                <div className="mt-4 pt-4 border-t border-blue-200 text-blue-800">
                  <strong className="font-black text-xs uppercase mr-2">Çeviri:</strong> {item.t || item.translation}
                </div>
              </section>
            )}

            {/* MİNİ TEST BÖLÜMÜ */}
            <VocabularyQuiz 
              word={item.word} 
              correctMeaning={item.meaning} 
              allMeanings={allMeanings} 
            />

            {/* Aksiyon Butonları */}
            <div className="grid grid-cols-2 gap-4">
               <Link href="/race" className="py-4 bg-emerald-600 text-white text-center rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                 Kelimelerle Yarış
               </Link>
               <Link href="/flashcards" className="py-4 bg-slate-100 text-slate-800 text-center rounded-2xl font-black hover:bg-slate-200 transition-all">
                 Kartlarla Çalış
               </Link>
            </div>
          </div>
        </div>

        {/* İÇ LİNKLEME: Google Botları için Diğer Kelimeler */}
        <section className="mt-12">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 px-2">Benzer Akademik Kelimeler</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {relatedSlugs.map((slug) => (
              <Link 
                key={slug} 
                href={`/vocabulary/${slug}`}
                className="bg-white p-4 border border-slate-200 rounded-2xl text-center text-sm font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
              >
                {slug}
              </Link>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
