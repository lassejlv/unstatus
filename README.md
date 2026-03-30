# unstatus

Monorepo for the app, workers, and shared Prisma/db package.

## Structure

```txt
apps/
  web/      TanStack Start app
  worker/   Hono worker that runs checks
packages/
  db/       Prisma config, schema, migrations, generated client
```

## Env files

You do **not** need a bunch of env files.

### Recommended setup

Use **one root env file**:

```bash
.env.local
```

That is what local `web` and `db` scripts use.

### Optional worker env

If you want the worker to have its own local overrides, you can also use:

```bash
apps/worker/.env
```

But that is optional. If you keep everything in the root `.env.local`, that is fine.

## Local development

Install dependencies from the repo root:

```bash
bun install
```

Run both app and worker:

```bash
bun run dev
```

Or run them separately:

```bash
bun run dev:web
bun run dev:worker
```

## Prisma

Prisma lives in `packages/db`.

Useful commands:

```bash
bun run db:generate
bun run db:migrate:deploy
```

The generated client is written to:

```txt
packages/db/generated
```

## Main env vars

### Web (`apps/web`)

Required in practice:

- `DATABASE_PUBLIC_URL`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `POLAR_MODE`
- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_PRO_ID`

Optional worker integration vars:

- `WORKER_SECRET`
- `WORKER_URL`
- `WORKER_EU_URL`
- `WORKER_US_URL`
- `WORKER_ASIA_URL`

### Worker (`apps/worker`)

- `DATABASE_URL`
- `WORKER_SECRET`
- `REGION` (`eu`, `us`, `asia`, etc.)
- `POLL_INTERVAL`
- `PORT`

## Deploying

This repo is set up for Railway.

### Step-by-step: deploy the web app

1. Create a new Railway service from this GitHub repo.
2. Leave the service rooted at the **repo root**.
3. Railway will use the root `railway.json`.
4. Add the required web env vars:
   - `DATABASE_PUBLIC_URL`
   - `DATABASE_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `POLAR_MODE`
   - `POLAR_ACCESS_TOKEN`
   - `POLAR_WEBHOOK_SECRET`
   - `POLAR_PRO_ID`
5. If the web app should call workers, also add:
   - `WORKER_SECRET`
   - `WORKER_URL` or `WORKER_EU_URL` / `WORKER_US_URL` / `WORKER_ASIA_URL`
6. Deploy.

Railway will run:

```bash
bun run build
bun run start
```

During the web build it will:

1. run Prisma migrations
2. generate the Prisma client from `packages/db`
3. build the TanStack app in `apps/web`

### Step-by-step: deploy one worker

1. Create another Railway service from the **same GitHub repo**.
2. Set the service **Root Directory** to:

   ```txt
   apps/worker
   ```

3. Railway will use `apps/worker/railway.json`.
4. Add these env vars to the worker service:

   ```bash
   DATABASE_URL=...
   WORKER_SECRET=...
   REGION=eu
   POLL_INTERVAL=10
   ```

   `PORT` is usually injected by Railway automatically, so you normally do not need to set it yourself.

5. Deploy.

The worker build will:

1. go back to the monorepo root
2. install workspace dependencies
3. generate Prisma client from `packages/db`
4. build the worker binary

The worker starts with:

```bash
./worker
```

After deploy, check it by opening:

```txt
https://your-worker-url/health
```

You should get:

```json
{"status":"ok"}
```

### Step-by-step: deploy multiple workers

If you want multiple workers, deploy multiple copies of `apps/worker`.

#### Example worker envs

##### EU worker

```bash
DATABASE_URL=...
WORKER_SECRET=same-secret
REGION=eu
POLL_INTERVAL=10
```

##### US worker

```bash
DATABASE_URL=...
WORKER_SECRET=same-secret
REGION=us
POLL_INTERVAL=10
```

##### Asia worker

```bash
DATABASE_URL=...
WORKER_SECRET=same-secret
REGION=asia
POLL_INTERVAL=10
```

Then configure the web service with the worker URLs:

```bash
WORKER_SECRET=same-secret
WORKER_EU_URL=https://worker-eu.up.railway.app
WORKER_US_URL=https://worker-us.up.railway.app
WORKER_ASIA_URL=https://worker-asia.up.railway.app
```

If you only run one worker, set:

```bash
WORKER_SECRET=same-secret
WORKER_URL=https://worker.up.railway.app
```

## Notes

- Web deploy handles migrations.
- Workers do **not** run migrations.
- Workers only need the generated Prisma client and runtime env vars.
- Use the **same** `WORKER_SECRET` on the web service and every worker service.
