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

## Vercel Cron

The top margins cron is configured in `vercel.json` to call `/api/cron/top-margins` without putting the secret in the URL. Keep `CRON_SECRET` and `FINNHUB_API_KEY` configured as Vercel environment variables.

Vercel Cron sends an `Authorization` header automatically when `CRON_SECRET` is present in the project environment. The cron route accepts only this header format:

```
Authorization: Bearer <CRON_SECRET>
```

Do not add `CRON_SECRET` as a query string or log it. For local/manual testing, call the endpoint with the same header-based bearer token pattern.

© 2025 EnglishMeter
