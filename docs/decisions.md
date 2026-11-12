# Architecture decisions

Short records of choices made where the brief was ambiguous or a trade-off was needed.
Newest decisions are appended; superseded ones stay, marked as such.

## ADR-001: API-first, thin handlers

Every operation lives under `/api/v1`. Route handler → Zod validation → service → repository/Prisma. The web UI calls the same endpoints through TanStack Query; there are no server actions with business logic. The mobile app generates its client from `/api/v1/openapi.json`. (Implemented from Phase 2.)

## ADR-002: UUIDv7 primary keys

Time-ordered UUIDs give stable, index-friendly cursor pagination (`WHERE id < $cursor ORDER BY id DESC`) without leaking row counts. Prisma generates them (`uuid(7)`); the seed generates ones that match each row's `createdAt`.

## ADR-003: Money is integer minor units

Amounts are stored as integer kobo in `*Kobo` columns with a `currency` code (default `NGN`). The suffix makes the unit impossible to miss; formatting happens only at the edge (`formatMoney`). The brief's `quotedAmount`/`finalAmount` are `quotedAmountKobo`/`finalAmountKobo`.

## ADR-004: PostGIS with a graceful fallback

Search needs "within N km, nearest first". `artisan_profiles.location` is a `geography(Point,4326)` **generated column** derived from `lat`/`lng`, indexed with GiST, so application code only ever writes `lat`/`lng`. It is created in a hand-written migration (`…_postgis`) that is a no-op when the extension is unavailable. In that case search uses the `("status","lat","lng")` btree as a bounding-box prefilter plus Haversine. `GET /api/v1/ready` reports which strategy the database supports.
Consequence: `schema.prisma` declares `location` as `Unsupported(...)`. Use the `postgis/postgis` image for development (docker-compose does).

## ADR-005: Integrity rules live in the database too

Zod validates at the edge; the database is the last line. `…_integrity` adds CHECK constraints (rating 1–5, coordinates, price ranges, availability windows, one-owner evidence, report targets), partial unique indexes (one pending verification per artisan, one live dispute per request, one pending quote per request) and append-only triggers on `request_events` and `audit_logs`. The trust engine reads `request_events`, so it must not be editable.

## ADR-006: Tooling versions

Prisma 7 (driver adapter `@prisma/adapter-pg`, `prisma.config.ts`, generated client in `src/generated`, git-ignored), Next.js 16 (Turbopack, App Router), Tailwind CSS v4 (CSS-first: design tokens are in `src/app/globals.css` under `@theme`, there is no `tailwind.config.js`), Zod 4, ESLint 9 flat config (`eslint-config-next` 16 does not yet support ESLint 10), TypeScript 5.9 (TypeScript 7 is too new for the surrounding tooling). Revisit when the ecosystem catches up.

## ADR-007: Customer addresses are private until acceptance

`service_requests` stores the exact address but also a coarse `areaLabel`. Until a request is ACCEPTED the API returns only `areaLabel` and distance rounded to 0.5 km to the artisan. After acceptance the exact address and the customer's phone are released. Artisan WhatsApp/phone numbers are released to the customer under the same rule.

## ADR-008: Identity documents are never public URLs

`identity_verifications` stores private storage **keys** (`documentKey`, `selfieKey`), served only to admins through short-lived signed URLs. The ID number itself is not stored: only `documentLast4` and an HMAC (`documentNumberHash`) used to flag the same ID on several accounts.

## ADR-009: One account, several roles

`users.roles` is an enum array. `ARTISAN` is granted when an `artisan_profiles` row is created, so one login can hire and be hired. The seed includes such a user.

## ADR-010: Request lifecycle details fixed for Phase 4

`PENDING → QUOTED → ACCEPTED → EN_ROUTE → IN_PROGRESS → AWAITING_CONFIRMATION → COMPLETED`, plus `DECLINED`, `CANCELLED`, `EXPIRED`, `DISPUTED`. A rejected quote returns the request to `PENDING` (the artisan may re-quote or decline) and is recorded as `QUOTE_REJECTED`. Transitions use optimistic locking on `service_requests.version`. Customers can confirm completion or open a dispute from `AWAITING_CONFIRMATION`.

## ADR-011: Email delivery is needed for password reset

The brief lists an SMS provider but also email+password accounts and `POST /auth/password/forgot`. Phase 2 adds an `EmailProvider` interface (mock + SMTP/Resend adapter) next to the SMS one. OTP rows already carry a `channel`.

## ADR-012: Self-hosted fonts

Bricolage Grotesque (display) and Figtree (text) come from `@fontsource-variable/*` and are bundled. No request to Google Fonts: faster on patchy connections and no third-party data transfer (NDPR).

## ADR-013: Production refuses insecure configuration

At boot, `NODE_ENV=production` rejects mock SMS/storage providers and non-https `APP_URL`. `ALLOW_INSECURE_LOCAL=true` bypasses this for running the production image on a laptop (docker compose). It must never be set on a real deployment.

## ADR-014: Draft autosave is client-side

The 3-step request form autosaves to the browser (IndexedDB/localStorage), not to the server, so abandoned drafts never become requests or notifications.

## ADR-015: Demo data is separate from reference data

`npm run db:seed:reference` (categories) is safe everywhere, including production. Demo users, artisans and requests load only outside production (or with `ALLOW_DEMO_SEED=true`). The seed also writes an _interim_ denormalised trust score so search sorting is meaningful before Phase 5; the trust engine replaces it.

## ADR-016: Sessions are httpOnly cookies on the web, bearer tokens on mobile

Access token: 15-minute JWT (`og_at`). Refresh token: opaque, stored hashed, rotated on every use; presenting a rotated token revokes its whole family. The web client never sees either token. Requests with `X-Client-Type: mobile` also get the tokens in the body. Every API call re-reads the user row, so suspension takes effect immediately. Cookie-authenticated writes must carry a same-origin `Origin` (CSRF), on top of `SameSite=Lax`.

## ADR-017: One transition endpoint, optimistic locking

`POST /requests/:id/actions` takes `{ action, … }`; the table of legal moves is `TRANSITIONS` in `src/server/services/requests.ts`. Each move is an `UPDATE … WHERE version = ? AND status = ?` inside a transaction with its event and notification, so two people acting at once cannot both win. Jobs left in AWAITING_CONFIRMATION for 72 hours are confirmed by the system.

## ADR-018: Chat and updates use polling, not SSE

Messages poll every 6 s and request state every 15 s while the tab is visible. It works on every host (including serverless) and through flaky mobile proxies, at a cost that is small at this scale. Supersedes the SSE note on the `messages` index.

## ADR-019: Storage is local disk (development) or S3-compatible (production); Cloudinary dropped

Supersedes the `cloudinary` option. S3 is called through hand-written Signature V4 requests, so no SDK is bundled. Keys are `pub/<purpose>/<owner>/<uuid>.<ext>` or `priv/…`; files are identified by magic bytes, never by the client's content type; private files are reachable only through expiring signed URLs.

## ADR-020: Email provider is Resend (or mock)

Implements ADR-011. `EMAIL_PROVIDER=resend` with `RESEND_API_KEY`.

## ADR-021: Strict CSP through `src/proxy.ts`

A per-request nonce with `strict-dynamic`; no inline scripts except the theme bootstrap, which carries the nonce. `style-src` allows inline style attributes because measured widths (bars, gauge) need them. Every page is therefore rendered on demand, which suits a signed-in, data-driven app.

## ADR-022: Visual language is "signwriter and job ticket"

Paper, ink, danfo yellow, signwriter red; square corners, 2px rules, hard offset shadows; Archivo (condensed for headings) and JetBrains Mono, both self-hosted (updates ADR-012). The trust score is drawn as an analog meter. Tokens and the reusable utilities (`card-surface`, `field`, `ticket-label`, `stamp`, `hazard`, `pressable`) live in `src/app/globals.css`. Landing-page claims are generated from live data; nothing on the site states a certification, guarantee or figure the system cannot back up.
