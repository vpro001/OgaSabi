# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── deps: full install (dev deps needed for build and migrations) ───
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── build: generate Prisma client and build Next.js (standalone output) ─
FROM deps AS build
COPY . .
RUN npx prisma generate
# Real values are validated at boot, not at build time.
RUN SKIP_ENV_VALIDATION=1 npm run build

# ── migrate: one-shot job image: applies migrations, loads reference data ─
FROM build AS migrate
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed/index.ts --reference-only"]

# ── runner: minimal runtime image ───────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 ogasabi && useradd --system --uid 1001 --gid ogasabi ogasabi
COPY --from=build --chown=ogasabi:ogasabi /app/.next/standalone ./
COPY --from=build --chown=ogasabi:ogasabi /app/.next/static ./.next/static
COPY --from=build --chown=ogasabi:ogasabi /app/public ./public
USER ogasabi
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
