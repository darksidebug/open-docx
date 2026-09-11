# syntax=docker/dockerfile:1

# ---- deps: install full dependencies once, reused by the build stage ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps matches this repo's own install requirements (see README);
# some Tiptap sub-packages pin exact peer versions that otherwise conflict.
RUN npm ci --legacy-peer-deps

# ---- dev: local development, hot reload ----
# Meant to run with your local source bind-mounted over /app (see
# docker-compose.dev.yml) — COPY . . here is just a fallback so `docker build
# --target dev` alone still produces something runnable.
FROM node:22-alpine AS dev
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000 1234
# Runs Next.js with --webpack (not the default Turbopack) specifically here:
# Turbopack's own Rust-based file watcher doesn't read CHOKIDAR_USEPOLLING /
# WATCHPACK_POLLING (those are webpack/chokidar-specific) and has no
# documented polling equivalent, so it can silently miss changes made on the
# host through a Docker bind mount. Webpack's watcher does respect those
# vars (set in docker-compose.dev.yml). Outside Docker, `npm run dev` still
# uses Turbopack as normal — this only affects the containerized dev path.
CMD ["npm", "run", "dev:docker"]

# ---- builder: compile the Next.js app ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- prod-deps: production-only dependencies for the final image ----
FROM node:22-alpine AS prod-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# ---- runner: what actually ships ----
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat \
  && npm install -g pm2
WORKDIR /app
ENV NODE_ENV=production

# The collab server (server/collab-server.ts) runs as plain TypeScript via
# `tsx` — not compiled by `next build` — so it needs its own source (server/,
# lib/, and anything they import, e.g. custom Tiptap extensions under
# lib/extensions/ and the React components they reference) present at
# runtime, plus tsconfig.json for the `@/*` path alias. Simplest correct way
# to guarantee that is to ship the full source tree, not a cherry-picked
# subset.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY . .
COPY --from=builder /app/.next ./.next

EXPOSE 3000 1234

# Runs both the Next.js app (its default `next start`, via `npm run start`)
# and the collaboration server in parallel inside this one container, each
# independently restarted by pm2 if it crashes. See ecosystem.config.js.
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
