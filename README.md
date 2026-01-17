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
