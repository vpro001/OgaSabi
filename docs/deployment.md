# Deployment

OgaSabi is one Node process (Next.js standalone output) plus PostgreSQL with PostGIS.

## 1. Environment

Copy `.env.example` and set, at minimum:

| Variable                                                 | Notes                                                                                                                                                                                                                                                          |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_URL`                                                | Public https origin. Used for cookies, CSRF checks, links in messages.                                                                                                                                                                                         |
| `DATABASE_URL`                                           | PostgreSQL 14+; PostGIS recommended (search falls back to Haversine without it).                                                                                                                                                                               |
| `JWT_ACCESS_SECRET`, `DATA_HMAC_SECRET`, `CRON_SECRET`   | `openssl rand -base64 48` each. Rotating `DATA_HMAC_SECRET` invalidates outstanding one-time codes and ID-number fingerprints.                                                                                                                                 |
| `SMS_PROVIDER=termii` + `TERMII_*`                       | The mock provider is refused in production.                                                                                                                                                                                                                    |
| `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`, `EMAIL_FROM` | Same.                                                                                                                                                                                                                                                          |
| `STORAGE_PROVIDER=s3` + `S3_*`                           | Any S3-compatible store. Set `S3_ENDPOINT` for R2/MinIO/Spaces (path-style). `S3_PUBLIC_BASE_URL` is the CDN/public URL for the `pub/` prefix; `priv/` objects are only ever served through presigned URLs, so keep the bucket private apart from that prefix. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` / `_PHONE` / `_LEGAL_ENTITY` | Shown on help and legal pages. `NEXT_PUBLIC_*` values are baked in at build time.                                                                                                                                                                              |

The server refuses to boot in production with mock providers or a non-https `APP_URL` (ADR-013).

## 2. Build and run

```bash
docker build --target runner -t ogasabi .
docker build --target migrate -t ogasabi-migrate .
docker run --env-file .env ogasabi-migrate     # migrations + categories; run on every release
docker run --env-file .env -p 3000:3000 ogasabi
```

Health: `GET /api/v1/health` (liveness), `GET /api/v1/ready` (database + geo strategy).

Create the first administrator by registering normally, then: `UPDATE users SET roles = array_append(roles, 'ADMIN') WHERE email = '…';`

## 3. Scheduled jobs

Call with `Authorization: Bearer $CRON_SECRET` from any scheduler:

| Endpoint                        | Schedule         | Does                                                                                                                        |
| ------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/cron/maintenance` | every 10 minutes | expires unanswered requests (24 h) and stale quotes (48 h), auto-confirms jobs left unconfirmed for 72 h, purges old tokens |
| `POST /api/v1/cron/trust`       | nightly          | recomputes every trust score (recency and penalty decay)                                                                    |

## 4. Behind a proxy

- Terminate TLS in front and forward `X-Forwarded-For`; the first address is used for rate limiting and audit logs. Make sure the proxy overwrites that header rather than appending to a client-supplied one.
- Rate limits are per process. With more than one instance, add a shared limiter at the proxy (see `src/server/rate-limit.ts`).
- Allow request bodies up to `UPLOAD_MAX_BYTES` (8 MB by default).

## 5. Payments (optional)

`PAYMENTS_ENABLED=true` with `PAYSTACK_SECRET_KEY` turns on online callout deposits. Point the Paystack webhook at `POST /api/v1/webhooks/paystack`. OgaSabi does not hold payment for the job itself. This path has not been exercised against live Paystack; test it in Paystack test mode before enabling.

## 6. Before launch

- Have a lawyer review `/terms` and `/privacy`; they are a sensible baseline, not legal advice.
- Send one real SMS, one real email and one upload through the configured providers.
- Back up the database; `request_events` and `audit_logs` are append-only by trigger and are your record of what happened.
