# AGENTS.md - Coding Agent Guidelines

## Build Commands

```bash
# Install dependencies
bun install

# Development server (port 3000)
bun --bun run dev

# Production build
bun --bun run build

# Preview production build
bun --bun run preview
```

## Test Commands

```bash
# Run all tests
bun --bun run test

# Run a single test file
bun --bun run test -- src/components/button.test.tsx

# Run tests in watch mode
bun --bun run test -- --watch

# Run tests with coverage
bun --bun run test -- --coverage
```

## Database Commands

```bash
# Better Auth CLI
bunx --bun @better-auth/cli

# Generate Better Auth secret
bunx --bun @better-auth/cli secret

# Run Better Auth migrations
bunx --bun @better-auth/cli migrate

# Prisma commands (if needed)
npx prisma generate
npx prisma migrate dev
```

## Code Style Guidelines

### General

- **Runtime**: Bun (always use `--bun` flag)
- **Module system**: ES modules (`"type": "module"`)
- **Path aliases**: Use `@/` prefix for imports from `src/` (e.g., `@/lib/utils`)

### TypeScript

- **Strict mode**: Enabled - always write proper types
- **No unused locals/parameters**: Keep code clean
- **Target**: ES2022
- **JSX**: `react-jsx` transform
- Use explicit return types on public functions when ambiguous
- Define interfaces for component props

### Formatting

- **Quotes**: Double quotes for strings ("")
- **Semicolons**: Use semicolons
- **Trailing commas**: Use where appropriate
- **Indentation**: 2 spaces
- **Max line length**: ~100 characters (be reasonable)

### Imports

- Group imports: React/libraries first, then `@/` aliases, then relative
- Use `type` imports where applicable: `import { type ClassValue } from "clsx"`
- Prefer named imports over default imports when available

### Components

- Use function declarations (not arrow functions) for components
- Destructure props in function parameters
- Use `cn()` utility from `@/lib/utils` for className merging
- Use `data-slot` attributes for component identification
- Follow shadcn/ui patterns for UI components

Example:
```tsx
function Button({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "default" | "outline"
}) {
  return (
    <button
      data-slot="button"
      className={cn("base-classes", className)}
      {...props}
    />
  )
}
```

### Naming Conventions

- **Components**: PascalCase (e.g., `Button`, `CardHeader`)
- **Files**: Lowercase for routes, PascalCase for components
- **Hooks**: camelCase starting with `use` (e.g., `useSession`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Variables/functions**: camelCase

### Error Handling

- Use explicit error types when available
- Handle async errors with try/catch
- Use Zod for runtime validation
- Prefer early returns over nested conditionals

### Styling

- **Tailwind CSS v4** with `@theme` inline configuration
- Use `oklch()` color format in CSS variables
- CSS variables follow shadcn convention: `--color-*`
- Dark mode via `.dark` class
- Use `dark:` prefix for dark mode styles

### Project Structure

```
src/
  components/      # React components (UI, shared)
  components/ui/   # shadcn/ui components
  routes/          # TanStack Router file-based routes
  lib/             # Utilities, configurations (auth, prisma)
  hooks/           # Custom React hooks
  integrations/    # Third-party integrations
  orpc/            # oRPC server functions
  generated/       # Generated code (Prisma, etc.)
```

### Testing

- Uses Vitest with jsdom environment
- Use `@testing-library/react` for component tests
- No tests exist yet - create patterns for new features

### Key Libraries

- **Framework**: TanStack Start + TanStack Router
- **ORM**: Prisma v7 with PostgreSQL adapter
- **Auth**: Better Auth with Prisma adapter
- **Server**: oRPC for type-safe server functions
- **Query**: TanStack Query
- **UI**: shadcn/ui (radix-mira style), Radix UI primitives
- **Icons**: Hugeicons
- **Charts**: Recharts
- **Forms**: React Hook Form (if needed)

### Important Notes

- Always use `bun --bun` for scripts, not `bun run` alone
- File-based routing: files in `src/routes/` become routes
- Route tree is auto-generated (`routeTree.gen.ts`) - exclude from search
- Environment variables: Use `.env.local` (already ignored)
- Server functions: Use `createServerFn` from `@tanstack/react-start`
