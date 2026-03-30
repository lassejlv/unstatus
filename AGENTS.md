# AGENTS.md - Coding Agent Guidelines

## Context7 

Use mcp tool context7 to search up new tech or current if you do not know how to use them!

# Prisma and migrations

YOU DONT DARE FKN TOUCHING MY PRISMA COMMANDS OR WRITING ANY SQL CODE INTO PRISMA/MIGRATIONS, AT ALL IF YOU DO I WILL FIND YOU AND MURDER YOU WITH A FORK

# Routes

When navigating to /dashboard remember to add search tab => overview
Example `navigate({ to: '/dashboard', search: { tab: "overview"} })`

If you need to add components folder or any other file/folder that is not a route inside `/src/routes/**` you need to attach -<filename>.<ext> so it gets ignored

# orpc

Use this for backend stuff. src/orpc. Client rpc routes like: src/orpc/routers/<something>.ts

# Env

Use type-safe env, by adding them in `src/lib/env.ts`. Wich uses zod **v4**
Then import it and use env.<thing>

## Data Fetching & Mutations

Use **TanStack Query** for all data fetching and mutations.

- Use `useQuery` for fetching data
- Use `useMutation` for creating, updating, or deleting data
- Query client is already configured in the root provider


## Package Manager

Stop running build and use lint command idiot.

Use **Bun** as the package manager for this project.

- `bun install` - Install dependencies
- `bun run <script>` - Run scripts
- `bun test` - Run tests
- `bunx <package>` - Execute packages

## Known TypeScript Issue

There is a known TypeScript configuration error in this project:

- `TS5102: Option 'baseUrl' has been removed`

When running lint/typecheck commands, ignore this specific error for now unless the task is explicitly to fix TypeScript configuration.

## Frontend Style Rule

Keep UI styling plain and practical, closer to PlanetScale's visual tone.
Avoid vibe-coded aesthetics or trendy decorative effects.
