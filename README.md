# EnglishMeter Starter
Ready-to-run Next.js 14 + Prisma + Tailwind project for a CEFR English test (A1→C2).

## Quick Start
1. Install deps
```
npm install
```
2. Create `.env` from `.env.example` and set `DATABASE_URL` (Supabase/Postgres).
3. Generate Prisma client & create tables
```
npx prisma migrate dev
```
4. Seed questions/tests
```
npx ts-node scripts/seed.ts
```
5. Run
```
npm run dev
```
Open http://localhost:3000

© 2025 EnglishMeter

## Security headers and CSP

The application sets baseline security headers in `next.config.cjs`: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options`.

A Content Security Policy has intentionally not been enabled yet. The TradingView widget in `components/TradingViewWidget.tsx` loads `https://s3.tradingview.com/tv.js` dynamically and the embedded TradingView runtime may require additional script, frame, image, style, or connection origins. Adding a strict CSP without a full runtime origin audit could break charts or create a false sense of security. When CSP is introduced, it should explicitly allow the required TradingView origins, including `script-src https://s3.tradingview.com`, and be tested against every widget view.
