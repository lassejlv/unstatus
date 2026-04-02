# Unstatus

> A modern, open-source status page and monitoring platform. Built for teams who need reliable uptime tracking with beautiful public status pages.

## What is Unstatus?

Unstatus is a full-stack status page and service monitoring solution. It lets you:

- **Monitor your services** — Automated health checks from multiple global regions (EU, US, Asia)
- **Public status pages** — Beautiful, customizable status pages for your users
- **Incident management** — Create, update, and resolve incidents with real-time updates
- **Team collaboration** — Invite team members with role-based access
- **Subscriber notifications** — Keep users informed via email when incidents occur

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | TanStack Start (React + SSR), Tailwind CSS v4, shadcn/ui |
| **Backend** | oRPC (type-safe API), Better Auth (authentication) |
| **Database** | PostgreSQL + Prisma ORM |
| **Workers** | Hono (lightweight checks runtime) |
| **Payments** | Polar.sh integration |
| **Email** | Resend + React Email |
| **Runtime** | Bun (package management, building, testing) |

## Project Structure

```
unstatus/
├── apps/
│   ├── web/           # TanStack Start app (dashboard + status pages)
│   └── worker/        # Hono worker (health check runner)
├── packages/
│   ├── db/            # Prisma schema, migrations, generated client
│   ├── email/         # React Email templates
│   └── caddy/         # Caddy server configuration
└── .env.local         # Single root env file for local dev
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- PostgreSQL database (local or cloud)
- Google OAuth credentials (for authentication)
- Polar.sh account (for subscriptions)

### 1. Clone & Install

```bash
git clone <repo-url>
cd unstatus
bun install
```

### 2. Environment Setup

Create a single `.env.local` at the root:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/unstatus"
DATABASE_PUBLIC_URL="postgresql://user:pass@localhost:5432/unstatus"

# Auth (Google OAuth)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Payments (Polar.sh)
POLAR_MODE="sandbox"           # or "production"
POLAR_ACCESS_TOKEN="your-token"
POLAR_WEBHOOK_SECRET="your-secret"
POLAR_PRO_ID="your-product-id"

# Worker communication (can be same secret for local dev)
WORKER_SECRET="random-secret-min-32-chars-long-here"
```

### 3. Database Setup

```bash
# Deploy migrations & generate Prisma client
bun run db:migrate:deploy
bun run db:generate
```

### 4. Start Development

```bash
# Run both web app and worker
bun run dev

# Or run separately
bun run dev:web
bun run dev:worker
```

The web app will be at `http://localhost:3000`

## Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start web + worker concurrently |
| `bun run dev:web` | Start only the web app |
| `bun run dev:worker` | Start only the worker |
| `bun run db:migrate:dev` | Create a new migration |
| `bun run db:migrate:deploy` | Deploy migrations |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run lint` | Run oxlint on all source files |

## Deployment

This repo is configured for [Railway](https://railway.app) deployment.

### Deploy the Web App

1. Create a new Railway service from this GitHub repo
2. Keep the **Root Directory** as the repo root (`.`) — Railway will use `railway.json`
3. Add required environment variables (see [Env vars reference](#environment-variables))
4. Deploy — Railway runs `bun run build` then `bun run start`

The build process:
1. Deploys Prisma migrations
2. Generates the Prisma client
3. Builds the TanStack Start app

### Deploy Workers

Workers run health checks from different geographic regions.

**Single worker:**
1. Create another Railway service from the same repo
2. Set **Root Directory** to `apps/worker`
3. Add environment variables:
   ```
   DATABASE_URL=...
   WORKER_SECRET=same-as-web
   REGION=eu
   POLL_INTERVAL=10
   ```
4. Deploy

**Multiple regional workers:**
Deploy multiple copies with different `REGION` values:
- Worker 1: `REGION=eu`
- Worker 2: `REGION=us`
- Worker 3: `REGION=asia`

Then configure the web service with all worker URLs:
```
WORKER_SECRET=shared-secret
WORKER_EU_URL=https://worker-eu.up.railway.app
WORKER_US_URL=https://worker-us.up.railway.app
WORKER_ASIA_URL=https://worker-asia.up.railway.app
```

Verify a worker is running by visiting:
```
https://your-worker-url/health
```
→ Should return `{"status":"ok"}`

## Environment Variables

### Web App (`apps/web`)

**Required:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (private) |
| `DATABASE_PUBLIC_URL` | PostgreSQL connection string (used for migrations) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `POLAR_MODE` | `sandbox` or `production` |
| `POLAR_ACCESS_TOKEN` | Polar.sh API token |
| `POLAR_WEBHOOK_SECRET` | Polar.sh webhook secret |
| `POLAR_PRO_ID` | Polar product ID for Pro plan |

**Optional (for worker integration):**

| Variable | Description |
|----------|-------------|
| `WORKER_SECRET` | Shared secret between web and workers |
| `WORKER_URL` | Single worker URL |
| `WORKER_EU_URL` / `WORKER_US_URL` / `WORKER_ASIA_URL` | Regional worker URLs |

### Worker (`apps/worker`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `WORKER_SECRET` | Must match web app's `WORKER_SECRET` |
| `REGION` | Region identifier (`eu`, `us`, `asia`, etc.) |
| `POLL_INTERVAL` | Seconds between health check polls (default: 10) |
| `PORT` | Server port (usually auto-set by Railway) |

## Architecture Notes

- **Web runs migrations**: Only the web service deploys database migrations
- **Workers are stateless**: Workers only need the Prisma client and env vars
- **Shared secret**: `WORKER_SECRET` must be identical across web and all workers
- **Monorepo workflow**: Uses Bun workspaces — install once at root, run filtered commands

## License

[MIT](./LICENSE)
