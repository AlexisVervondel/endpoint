# Architecture

## Stack

| Layer | Technology | Rationale |
|---|---|---|
| Language | TypeScript | Single language across frontend + backend; strong types catch errors early |
| Backend | Node.js + Fastify | Schema-first validation, native async, ~2× Express throughput |
| Frontend | React + Vite | Fast HMR, minimal config, TypeScript-native |
| Database | PostgreSQL | ACID guarantees, mature, strong compliance story |
| ORM | Drizzle | SQL-first migrations, zero runtime overhead, full type inference |
| Package manager | pnpm | Space-efficient, strict dependency isolation, workspace support |
| Repo structure | pnpm monorepo | Shared types and utilities across apps without publishing packages |

## Repository Layout

```
/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # React + Vite frontend
├── packages/
│   ├── db/           # Drizzle schema + migrations
│   └── shared/       # Shared types and utilities
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── security.yml
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Architecture Decision Records

### ADR-001: Fastify over Express (2026-04-21)

**Decision**: Use Fastify as the HTTP framework.

**Context**: Team is small, internal tools, performance matters for SRE dashboards. Fastify provides schema-based request validation out of the box (no extra middleware), performs ~2× faster than Express in benchmarks, and has excellent TypeScript support.

**Consequences**: Slightly different plugin model than Express. Team must learn route schema definitions. Net benefit: request validation and Swagger docs are free.

### ADR-002: Drizzle over Prisma (2026-04-21)

**Decision**: Use Drizzle ORM.

**Context**: Prisma ships a query engine binary and generates a large client. For internal tools this adds startup latency and complicates Docker images. Drizzle compiles to plain SQL queries, has no runtime engine, and provides identical type safety.

**Consequences**: No Prisma Studio GUI. Migrations are SQL files (version-controlled, auditable — a compliance positive).

### ADR-003: Monorepo (2026-04-21)

**Decision**: Single pnpm workspace monorepo for all IT apps.

**Context**: We will build multiple internal tools (onboarding, incident tracker, request system). Sharing auth middleware, database schema, and type definitions without publishing packages saves significant overhead.

**Consequences**: Build times grow with the repo. Turborepo or `--filter` can be added when needed.

## Compliance Notes

- All secrets via environment variables; `.env` files are `.gitignore`d
- No secrets in code or Docker images
- Signed commits enforced via branch protection
- Dependency CVE scanning runs on every PR (npm audit) and weekly (Dependabot)
- SAST (CodeQL) runs on every PR and on a weekly schedule
- Database migrations are versioned SQL files — full audit trail
