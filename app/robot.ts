import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/private/', 
        '/admin/', 
        '/api/',      // API rotalarını taramasını engeller
        '/*_next/',   // Next.js iç dosyalarını taramasını engeller (opsiyonel)
        '/*?*',       // Parametreli URL'lerin taranmasını engeller (SEO için kritik olabilir)
      ],
    },
    sitemap: 'https://englishmeter.net/sitemap.xml',
  }
}
