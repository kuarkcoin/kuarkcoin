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

## Environment Example
```env
ENABLE_PREMIUM=true
DEMO_PREMIUM_USER=false
```

Vercel environment variable changes require a Production redeploy.

## Premium Roadmap

### Phase 1
* Premium UI
* Locked sections
* Pricing page

### Phase 2
* User login
* Watchlist
* Email alerts

### Phase 3
* Stripe / Lemon Squeezy / Paddle subscription
* Telegram alerts
* Verified performance analytics

© 2025 EnglishMeter
