import { MetadataRoute } from 'next';
import vocab1 from '@/data/yds_vocabulary.json';
import vocab2 from '@/data/yds_vocabulary1.json';
import dailyEnEs from '@/data/daily_en_es.json';
import dailyEnAr from '@/data/daily_en_ar.json';

// Slug oluşturma fonksiyonu - page.tsx ile %100 aynı olmalı
function createSlug(word: string) {
  return String(word)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://englishmeter.net';
  const now = new Date();

  // 1. STATİK SAYFALAR
  const staticPages = [
    '',
    '/vocabulary',
    '/es/vocabulary',
    '/ar/vocabulary',
    '/race',
    '/flashcards',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 1.0,
  }));

  // 2. TÜRKÇE YDS KELİMELERİ (Unique Filter)
  const combinedTurkish = [...(vocab1 as any[]), ...(vocab2 as any[])];
  const turkishSlugs = new Set();
  const turkishRoutes = combinedTurkish
    .filter((item) => item && item.word)
    .map((item) => {
      const slug = createSlug(item.word);
      if (turkishSlugs.has(slug)) return null;
      turkishSlugs.add(slug);
      return {
        url: `${baseUrl}/vocabulary/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.8, // Önceliği biraz artırdık
      };
    })
    .filter(Boolean) as MetadataRoute.Sitemap;

  // 3. İSPANYOLCA GÜNLÜK KELİMELER (Unique Filter eklendi)
  const spanishSlugs = new Set();
  const spanishRoutes = (dailyEnEs as any[])
    .filter((item) => item && item.word)
    .map((item) => {
      const slug = createSlug(item.word);
      if (spanishSlugs.has(slug)) return null;
      spanishSlugs.add(slug);
      return {
        url: `${baseUrl}/es/vocabulary/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      };
    })
    .filter(Boolean) as MetadataRoute.Sitemap;

  // 4. ARAPÇA GÜNLÜK KELİMELER (Unique Filter eklendi)
  const arabicSlugs = new Set();
  const arabicRoutes = (dailyEnAr as any[])
    .filter((item) => item && item.word)
    .map((item) => {
      const slug = createSlug(item.word);
      if (arabicSlugs.has(slug)) return null;
      arabicSlugs.add(slug);
      return {
        url: `${baseUrl}/ar/vocabulary/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      };
    })
    .filter(Boolean) as MetadataRoute.Sitemap;

  return [
    ...staticPages,
    ...turkishRoutes,
    ...spanishRoutes,
    ...arabicRoutes,
  ];
}
