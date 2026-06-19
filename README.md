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

## AI Route Security

AI API routes require `Authorization: Bearer <ADMIN_API_TOKEN>` on every request. Set `ADMIN_API_TOKEN` to a long, random server-side value and never expose it to browser clients.

Optional Redis-backed rate limiting uses Upstash Redis via `@upstash/redis`. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or the compatible `KV_REST_API_URL` / `KV_REST_API_TOKEN`) to enable IP + endpoint based limits. If Redis environment variables are not present, the secure fallback is to enforce only the admin bearer token. Serverless in-memory rate limiting is intentionally not used because instances are ephemeral, may run in parallel, and cannot provide reliable global limits.
