# Unstatus

Open-source status page and uptime monitoring platform.

- Monitor services from multiple global regions
- Custom public status pages on your domain
- Incident management with real-time updates
- Email notifications for subscribers

## Tech Stack

- **Frontend:** TanStack Start, Tailwind CSS v4, shadcn/ui
- **Backend:** oRPC, Better Auth
- **Database:** PostgreSQL + Prisma
- **Workers:** Bun (health check runner)
- **Payments:** Polar.sh
- **Email:** Resend + React Email

## Quick Start

```bash
# Clone & install
git clone <repo-url>
cd unstatus
bun install

# Setup env
cp .env.example .env.local
# Edit .env.local with your credentials

# Database
bun run db:migrate:deploy
bun run db:generate

# Start dev
bun run dev        # Web + worker
bun run dev:web    # Web only
bun run dev:worker # Worker only
```

Web app runs at `http://localhost:3000`

## Development

| Command | Description |
|---------|-------------|
| `bun run dev` | Start web + worker |
| `bun run dev:web` | Start web only |
| `bun run dev:worker` | Start worker only |
| `bun run db:migrate:dev` | Create migration |
| `bun run db:migrate:deploy` | Deploy migrations |
| `bun run db:generate` | Generate Prisma client |
| `bun run lint` | Run linter |

## Deployment

### Railway

**Web app:**
1. Create service from this repo
2. Keep root directory as `.`
3. Add environment variables
4. Deploy — Railway runs `bun run build` then `bun run start`

**Workers:**
1. Create service, set root to `apps/worker`
2. Add `DATABASE_URL`, `WORKER_SECRET`, `REGION`
3. Deploy

For multiple regions, deploy workers with different `REGION` values (`eu`, `us`, `asia`) and configure URLs in web app.

## Environment Variables

### Web

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection |
| `DATABASE_PUBLIC_URL` | PostgreSQL (for migrations) |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `POLAR_MODE` | `sandbox` or `production` |
| `POLAR_ACCESS_TOKEN` | Polar.sh API token |
| `POLAR_WEBHOOK_SECRET` | Polar.sh webhook secret |
| `POLAR_PRO_ID` | Pro plan product ID |
| `WORKER_SECRET` | Shared with workers |
| `WORKER_EU_URL` / `WORKER_US_URL` / `WORKER_ASIA_URL` | Regional workers |

### Worker

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection |
| `WORKER_SECRET` | Must match web |
| `REGION` | `eu`, `us`, `asia`, etc. |
| `POLL_INTERVAL` | Seconds between checks (default: 10) |

## License

[MIT](./LICENSE)
