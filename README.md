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

## Rate limiting and logging

Sensitive write endpoints should call `lib/security/rate-limit.ts` before reading or mutating data. The helper automatically uses Vercel KV / Upstash Redis when `KV_REST_API_URL` + `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are configured. If neither KV provider is configured, it falls back to an in-memory counter.

The in-memory fallback is best-effort only. It is not a strict protection in serverless or horizontally scaled deployments because each function instance has its own memory and instances can be recycled at any time. Production deployments that need reliable protection for login/register, signals POST, billing checkout, admin mutations, and CSV export must configure KV/Upstash/Vercel KV.

Structured application logs are emitted through `lib/logging/logger.ts`. Only allow-listed operational fields are logged (`requestId`, `route`, `symbol`, `signal`, `userId`, `status`, `duplicate`, `providerEventId`, `errorCode`, `durationMs`). Do not log secrets, Authorization headers, cookies, service-role keys, Stripe secrets, full request bodies, or passwords.
