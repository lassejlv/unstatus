#!/bin/sh
set -e

# Start the ask API server in the background
cd /app && bun packages/caddy/src/index.ts &

# Start Caddy in the foreground
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
