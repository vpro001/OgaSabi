# OgaSabi

Find verified, trust-scored local artisans (electricians, plumbers, AC and generator technicians, mechanics, painters…) and request their services. _Oga_ means boss, _sabi_ means to know.
Primary market: Nigeria (₦, +234, mobile-first, low bandwidth). Locale, currency and calling code are configuration.

**Status:** feature-complete web app and API: accounts, geo search, artisan profiles and onboarding, the full request lifecycle with quotes and chat, reviews, trust engine, identity verification, complaints and disputes, notifications, admin console.

## Stack

Next.js 16 (App Router) · TypeScript strict · Prisma 7 + PostgreSQL/PostGIS · Tailwind CSS 4 + shadcn/ui · Zod · TanStack Query · React Hook Form · Vitest · Playwright

## Quick start (about 5 minutes)

Requirements: Node 22+, Docker.

```bash
cp .env.example .env              # dev secrets are already filled in
docker compose up -d ogasabi-db   # PostGIS on localhost:5432
npm ci
npm run db:deploy                 # apply migrations
npm run db:seed                   # categories + demo data (Port Harcourt, Lagos, Abuja)
npm run dev                       # http://localhost:3000
```

Or run everything in containers: `docker compose up --build` (app on :3000, runs migrations + categories only).

With the mock providers, one-time codes are shown on screen and uploads are written to `.data/uploads`.
After seeding, score every profile once: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/v1/cron/trust`.
Demo logins (password `OgaSabi#Dev2026`): `admin@ogasabi.test`, `adaeze.nwankwo@ogasabi.test` (customer), `ibifuro.briggs@ogasabi.test` (artisan).

## Scripts

| Command                                                        | What it does                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`                              | Next.js                                                                         |
| `npm run check`                                                | typecheck + lint + tests                                                        |
| `npm test`                                                     | unit + integration (integration needs a migrated, seeded database)              |
| `npm run e2e`                                                  | Playwright (desktop + mobile viewport)                                          |
| `npm run db:deploy` / `db:migrate`                             | apply / create migrations                                                       |
| `npm run db:seed` / `db:seed -- --reset` / `db:seed:reference` | seed data                                                                       |
| `npm run db:migrate:diff-check`                                | fail if migrations and `schema.prisma` disagree (needs `--shadow-database-url`) |

## Layout

```
prisma/             schema, migrations, seed (reference + demo)
src/app/            pages and /api/v1 route handlers
src/proxy.ts        Content-Security-Policy nonce + sign-in redirects
src/server/         http (handler wrapper, errors), auth, services, trust engine, providers
src/lib/            schemas (shared Zod), api client, formatting, geo, locale
src/components/     ui primitives, site shell, artisan and request components
src/hooks/          session, location, own artisan profile
tests/              unit, integration (real database), e2e (Playwright)
docs/               decisions, database, trust-score, deployment
```

## How it fits together

Route handler (`route()` in `src/server/http/handler.ts`: session, roles, CSRF, rate limit, Zod) → service → Prisma. The browser calls the same `/api/v1` endpoints through `src/lib/api.ts` and TanStack Query. See `docs/decisions.md` for the reasoning and `docs/deployment.md` to go live.

Commits follow Conventional Commits (enforced by commitlint + husky).
