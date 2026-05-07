# Bathla COS

Internal AI Chief of Staff for Butler Homes (codename **Butler**). Foundation phase: Next.js admin dashboard with Prisma + Supabase Postgres. WhatsApp / voice surfaces layer on later.

## Stack

- **Monorepo** — pnpm workspaces (Node 20+)
- **Web** — Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui
- **DB** — Supabase Postgres via Prisma ORM
- **Auth** (later) — Supabase Auth (`@supabase/ssr` already installed; flows not wired yet)

## Repo structure

```
.
├── apps/
│   └── web/          # @bathla-cos/web — Next.js admin app
├── packages/
│   └── database/     # @bathla-cos/database — Prisma client singleton + schema
├── docs/
│   └── decision-log.md
└── package.json
```

## Quickstart

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
# fill in Supabase + DATABASE_URL in both files
pnpm db:generate     # only after schema.prisma is added (see Known gaps)
pnpm dev
```

## Scripts (root)

| Command | What it does |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Build Next.js production bundle |
| `pnpm lint` | Lint the web app |
| `pnpm format` | Run Prettier across the repo |
| `pnpm db:generate` | Generate Prisma client (requires schema) |
| `pnpm db:migrate:dev` | Apply Prisma migration (requires schema + DB) |
| `pnpm db:studio` | Open Prisma Studio |

## Known gaps

- **`packages/database/prisma/schema.prisma` is intentionally absent** in this initial scaffold — provide it before running `pnpm db:generate`, `pnpm db:migrate:dev`, or anything else that touches the database.
- **`DATABASE_URL` lives in two `.env` files**: the root `.env` is read by the Prisma CLI, and `apps/web/.env.local` is read by the Next.js runtime (since the Prisma client gets imported by route handlers). Keep them in sync, or pick one convention and stick to it.
- **Supabase CLI is intentionally not installed** — Prisma owns migrations end-to-end. If you later need `supabase start` for local Postgres or `supabase gen types`, install on demand.

## License

MIT — see [LICENSE](./LICENSE).
