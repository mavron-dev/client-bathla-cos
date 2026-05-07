# @bathla-cos/database

Prisma client singleton + schema for the Bathla COS monorepo. Consumed by `@bathla-cos/web` via the `transpilePackages` config in `apps/web/next.config.mjs`.

## TODO

- Add `prisma/schema.prisma` (deliberately absent in the initial scaffold; user provides).
- After adding the schema, run `pnpm db:generate` from the repo root.
