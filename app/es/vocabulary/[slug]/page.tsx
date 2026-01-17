import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import dailyData from '@/data/daily_en_es.json';
import Link from 'next/link';

// Slug oluşturma yardımcı fonksiyonu (Sitemap ile aynı mantıkta olmalı)
const getSlug = (word: string) => 
  word.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

// SEO Ayarları (Metadata)
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = dailyData.find(v => getSlug(v.word) === params.slug);
  if (!item) return { title: 'Palabra no encontrada' };

  return {
    title: `¿Qué significa ${item.word}? - Definición y Ejemplos`,
    description: `Aprende el significado de "${item.word}" en español con frases de ejemplo. Mejora tu vocabulario en inglés con EnglishMeter.`,
    alternates: {
      languages: {
        'es-ES': `https://englishmeter.net/es/vocabulary/${params.slug}`,
        // Eğer bu kelime Türkçe setinde de varsa hreflang bağını burada kurabiliriz
      },
    },
  };
}

// Tüm sayfaların build anında (Static Generation) oluşturulmasını sağlar
export async function generateStaticParams() {
  return dailyData.map((item) => ({
    slug: getSlug(item.word),
  }));
}

export default function SpanishWordPage({ params }: { params: { slug: string } }) {
  const item = dailyData.find(v => getSlug(v.word) === params.slug);

  if (!item) notFound();

  return (
    <main className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Navigasyon */}
        <nav className="mb-8">
          <Link href="/es/vocabulary" className="text-blue-600 font-bold hover:underline">
            ← Diccionario de Inglés
          </Link>
        </nav>

        {/* Kelime Kartı */}
        <article className="bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h1 className="text-6xl font-black text-slate-900 mb-6">{item.word}</h1>
          
          <div className="space-y-8">
            {/* Anlam Bölümü */}
            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">
                Significado en español
              </h2>
              <p className="text-3xl font-bold text-blue-600">{item.meaning}</p>
            </section>

            {/* Örnek Cümle Bölümü */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
                Ejemplo de uso
              </h2>
              <p className="text-xl text-slate-800 font-medium italic mb-4 leading-relaxed">
                "{item.s}"
              </p>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-slate-600">
                  <span className="font-bold text-slate-900 italic">Traducción:</span> {item.t}
                </p>
              </div>
            </section>
          </div>

          {/* Etkileşim Butonu */}
          <div className="mt-10">
            <Link 
              href="/race" 
              className="block w-full py-4 bg-slate-900 text-white text-center rounded-2xl font-black hover:bg-black transition-all shadow-lg hover:shadow-xl"
            >
              ¡Practica con juegos!
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
