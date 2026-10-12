# OgaSabi

Find verified, trust-scored local artisans (electricians, plumbers, AC and generator technicians, mechanics, painters…) and request their services. _Oga_ means boss, _sabi_ means to know.
Primary market: Nigeria (₦, +234, mobile-first, low bandwidth). Locale, currency and calling code are configuration.

**Status:** Phase 1 of 8 (scaffold, schema, migrations, seed). See the phase plan in `docs/decisions.md` and the build log below.

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

Useful pages: `/design` (design tokens, dev only) · `/api/v1/health` · `/api/v1/ready`
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
prisma/            schema, migrations, seed (reference + demo)
src/app/           routes: pages and /api/v1 handlers
src/server/        logger, db client, HTTP envelope (services, repositories, trust engine arrive in later phases)
src/lib/           locale/money, phone, utils (shared with the browser)
src/components/ui/ shadcn-style primitives
docs/              decisions, database, (trust-score, API, deployment in later phases)
```

Commits follow Conventional Commits (enforced by commitlint + husky).
