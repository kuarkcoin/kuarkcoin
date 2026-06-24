# Kuarkcoin

Kuarkcoin, TradingView webhook sinyallerini Supabase'e kaydeden; finans terminali, haber akışı, finansal kalite sıralaması ve Gemini destekli özetler sunan Next.js uygulamasıdır. İçerikler yatırım tavsiyesi değildir.

## Teknoloji yığını
- Next.js App Router, React, TypeScript, Tailwind CSS
- Supabase PostgreSQL / service role server istemcisi
- Finnhub piyasa verisi ve haberleri
- Google Gemini AI
- Upstash Redis REST cache ve rate limit
- ts-node güvenlik/veri testleri

## Kurulum
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment değişkenleri
`.env.example` dosyasındaki public ve server-only ayrımına uyun. Server secret'ları `NEXT_PUBLIC_` ile başlamamalıdır.

## Supabase kurulumu
`signals` tablosunda en az `id`, `created_at`, `symbol`, `signal`, `price`, `score`, `reasons`, `timeframe`, `outcome` alanları bulunmalıdır. `SUPABASE_SERVICE_ROLE_KEY` sadece server runtime'da kullanılmalıdır.

## TradingView webhook
Endpoint: `POST /api/signals`. Secret JSON body'de `secret` olarak veya `Authorization: Bearer <SCAN_SECRET>` header'ında gönderilebilir.

Örnek JSON:
```json
{
  "secret": "SCAN_SECRET_VALUE",
  "symbol": "NASDAQ:AAPL",
  "signal": "BUY",
  "price": 210.12,
  "score": 24,
  "reasons": "MACD,VWAP_UP",
  "timeframe": "15",
  "t": 1760000000
}
```

## Cron kurulumu
Vercel Cron `/api/cron/top-margins` yolunu çağırır. Vercel, `Authorization: Bearer ${CRON_SECRET}` header'ını göndermelidir. `vercel.json` içinde secret interpolation kullanılmaz.

## AI ve rate limit
AI endpoint'leri `GEMINI_API_KEY` ister. Production'da sınırsız kullanımı önlemek için `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` ayarlanmalıdır.

## Komutlar
```bash
npm run lint
npm run typecheck
npm run test
npm run validate:data
npm run build
npm audit --omit=dev
```

## Vercel deployment
Vercel Environment Variables kısmına `.env.example` içinde belirtilen değerleri ekleyin. Supabase service role, Gemini, Finnhub, cron, admin ve webhook secret değerleri server-only kalmalıdır.

## Premium sonraki adımlar
- Supabase Auth veya tercih edilen auth sağlayıcısı
- Stripe Checkout, webhook ve customer portal
- Subscription tablosu ve rol eşleme
- Plan limitlerinin kullanıcı bazlı uygulanması
- Kullanıcı bazlı favoriler ve sinyal bildirimleri

## Güvenlik notları
Webhook, cron ve admin mutation endpoint'leri Bearer/secret kontrolü yapar. AI endpoint'lerinde payload limit, timeout, skor clamp ve rate limit vardır. Gizli anahtarları loglamayın.

## Yasal uyarı
Kuarkcoin yatırım danışmanlığı hizmeti sunmaz. Sinyaller, haberler ve AI özetleri gecikebilir veya hatalı olabilir; tüm kararların sorumluluğu kullanıcıya aittir.
