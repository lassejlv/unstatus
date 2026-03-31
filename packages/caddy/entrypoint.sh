#!/bin/sh
set -e

# Start the ask API server in the background
/usr/local/bin/proxy &

# Start Caddy in the foreground
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
