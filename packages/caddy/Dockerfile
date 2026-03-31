# Stage 1: Build the Bun binary
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY packages/db/ packages/db/
COPY packages/caddy/ packages/caddy/

RUN bun install
RUN cd packages/db && DATABASE_PUBLIC_URL="postgresql://dummy:dummy@localhost:5432/dummy" bun prisma generate --config prisma.config.ts
RUN cd packages/caddy && bun run build

# Stage 2: Runtime with Caddy
FROM caddy:2-alpine

RUN apk add --no-cache libstdc++ libgcc

COPY packages/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/packages/caddy/proxy /usr/local/bin/proxy
COPY packages/caddy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
