# Stage 1: Install deps and generate Prisma client
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY packages/db/ packages/db/
COPY packages/caddy/ packages/caddy/

RUN bun install
RUN cd packages/db && DATABASE_PUBLIC_URL="postgresql://dummy:dummy@localhost:5432/dummy" bun prisma generate --config prisma.config.ts

# Stage 2: Runtime with Caddy + Bun
FROM oven/bun:1-debian

# Install Caddy
RUN apt-get update && apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl \
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg \
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list \
    && apt-get update && apt-get install -y caddy \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed deps and generated Prisma client
COPY --from=builder /app/ /app/

# Copy Caddyfile
COPY packages/caddy/Caddyfile /etc/caddy/Caddyfile

# Copy entrypoint
COPY packages/caddy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
