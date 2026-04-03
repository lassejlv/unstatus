# AGENTS.md - Coding Agent Guidelines

## Build, Lint & Test Commands

Use **Bun** as the package manager:

```bash
# Development
bun run dev              # Start both web and worker dev servers
bun run dev:web          # Start web dev server only (port 3000)
bun run dev:worker       # Start worker dev server only

# Build
bun run build            # Build for production (web)
bun run build:web        # Build web app with DB migrations
bun run build:worker     # Build worker app

# Lint & Format
bun run lint             # Run oxlint on apps/web, apps/worker, packages/db

# Database
bun run db:generate      # Generate Prisma client
bun run db:migrate:deploy # Deploy migrations to production
bun run db:migrate:dev   # Run migrations in development

# Auth
bun run bauth            # Run better-auth CLI
```

**Note:** There are no test files currently. Tests can be added using Vitest (already configured).

## Package Manager

- Use **Bun** exclusively: `bun install`, `bun run <script>`, `bunx <package>`
- Workspace packages: `@unstatus/db`, `@unstatus/email`

## Code Style Guidelines

### Imports
- Use `@/` path aliases (configured in components.json and vite)
- Order: external libs first, then internal aliases, then relative imports
- Use named imports for React hooks: `import { useState, useEffect } from "react"`

### Types & Naming
- Use TypeScript strictly (`strict: true`)
- **PascalCase**: Components, Type aliases, Interfaces
- **camelCase**: Functions, variables, hooks
- **kebab-case**: File names (e.g., `status-pages.ts`, `use-mobile.ts`)
- **UPPER_SNAKE_CASE**: Constants, role arrays (e.g., `ORG_MEMBER_ROLES`)
- Prefix hooks with `use` (e.g., `useOnboarding`, `useTheme`)
- Prefix private/internal files/folders with `-` (e.g., `-onboarding-checklist.tsx`)

### Components
- Use `class-variance-authority` (cva) for component variants
- Use `cn()` utility from `@/lib/utils` for class merging
- Export components as named exports
- Use `React.ComponentProps` for HTML element props extension

### Error Handling
- Use ORPC errors: `throw new ORPCError("UNAUTHORIZED")` or `ORPCError("FORBIDDEN", { message: "..." })`
- Validate env variables with Zod in `src/lib/env.ts`
- Use `skipToken` from TanStack Query for conditional fetching

### Database & ORM
- **DO NOT** write SQL or touch Prisma migrations manually
- Use generated Prisma client via `@unstatus/db` package
- Use `prisma:generate`, `prisma:migrate:deploy`, `prisma:migrate:dev` scripts only

## Project Structure

### Apps
- `apps/web/` - TanStack Start + React web application
- `apps/worker/` - Bun-based background worker

### Web App Structure (`apps/web/src/`)
- `routes/` - TanStack Router file-based routes
- `components/` - React components
  - `ui/` - shadcn/ui base components
  - `-filename.tsx` - Private/internal components (dash prefix)
- `hooks/` - Custom React hooks (useXxx naming)
- `lib/` - Utilities, config, auth, env
- `orpc/` - oRPC routers and client
  - `router/` - API route handlers
  - `client.ts` - Typed client instance
- `integrations/` - Third-party integrations (TanStack Query, etc.)

### Route Conventions
- Non-route files in `routes/` must use `-` prefix: `-component.tsx`
- Dynamic params: `$paramId.tsx`
- Layout routes: `_authed.tsx`, `__root.tsx`

## Key Libraries & Patterns

### Routing
- **TanStack Router** - File-based routing
- Navigate with search params: `navigate({ to: '/dashboard', search: { tab: 'overview' } })`

### Data Fetching
- **TanStack Query** for all data operations
- Use `useQuery` for fetching, `useMutation` for mutations
- Use `orpc` client for typed API calls: `orpc.monitors.list.queryOptions()`

### Backend (oRPC)
- Define routers in `src/orpc/router/<name>.ts`
- Use procedures from `src/orpc/procedures.ts`:
  - `publicProcedure` - Unauthenticated
  - `authedProcedure` - Requires session
  - `orgProcedure(schema)` - Requires org membership
  - `orgAdminProcedure(schema)` - Requires admin/owner role
  - `orgOwnerProcedure(schema)` - Requires owner role

### Environment Variables
- Define in `src/lib/env.ts` using Zod v4
- Access via `env.VARIABLE_NAME`
- Load from `.env.local` at repo root

### UI Styling
- **Tailwind CSS v4** with CSS variables
- Keep UI plain and practical (PlanetScale-style aesthetic)
- Avoid decorative effects and trendy gradients
- Use shadcn/ui components from `src/components/ui/`

## Known Issues

- `TS5102: Option 'baseUrl' has been removed` - Ignore this TypeScript warning during linting unless explicitly fixing config

## External Resources

- Use Context7 MCP for documentation lookups on unfamiliar tech
- shadcn/ui registry: components.json configured for radix-mira style
- Icon library: @hugeicons/react (from components.json)
