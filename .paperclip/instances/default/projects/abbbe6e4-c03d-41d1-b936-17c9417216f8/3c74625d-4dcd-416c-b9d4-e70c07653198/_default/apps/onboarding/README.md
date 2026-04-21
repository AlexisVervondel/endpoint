# Employee Onboarding Portal — API

Fastify backend for the HR onboarding platform. Manages new-hire lifecycle, checklists, document records, and provisioning requests with a full NIS2/SOC2 audit trail.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify 5
- **Database**: PostgreSQL via Drizzle ORM (`@its/db`)
- **Port**: `3002` (configurable via `ONBOARDING_PORT`)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/onboarding/employees` | List employees with progress summary |
| POST | `/api/onboarding/employees` | Create new hire (seeds checklist + provisioning) |
| GET | `/api/onboarding/employees/:id` | Get employee with full checklist/docs/provisioning |
| PATCH | `/api/onboarding/employees/:id` | Update employee status/details |
| GET | `/api/onboarding/employees/:id/checklist` | List checklist items |
| POST | `/api/onboarding/employees/:id/checklist` | Add checklist item |
| POST | `/api/onboarding/employees/:id/checklist/:itemId/complete` | Mark item complete |
| DELETE | `/api/onboarding/employees/:id/checklist/:itemId` | Remove checklist item |
| GET | `/api/onboarding/employees/:id/documents` | List uploaded documents |
| POST | `/api/onboarding/employees/:id/documents` | Register document metadata |
| GET | `/api/onboarding/employees/:id/documents/:docId` | Get document metadata |
| GET | `/api/onboarding/employees/:id/provisioning` | List provisioning requests |
| POST | `/api/onboarding/employees/:id/provisioning` | Create provisioning request |
| PATCH | `/api/onboarding/employees/:id/provisioning/:reqId` | Update request status |

## Document Storage Key Format

When registering document metadata via `POST /api/onboarding/employees/:id/documents`, the `storageKey` field must conform to:

```
employees/{employeeId}/{filename}
```

Where:
- `{employeeId}` — alphanumeric characters and hyphens only (matches the employee's UUID)
- `{filename}` — 1–100 characters; alphanumeric, dots, underscores, hyphens only

**Pattern**: `^employees/[a-zA-Z0-9-]+/[a-zA-Z0-9._-]{1,100}$`

The server additionally validates that:
- The key is prefixed with `employees/{employeeId}/` matching the URL parameter (prevents cross-employee key injection)
- The key contains no path traversal sequences (`..`)

Example valid key: `employees/a1b2-c3d4/contract-signed-2024.pdf`

## Authentication & Authorization

All `/api/*` routes require a valid Bearer JWT (`Authorization: Bearer <token>`). Tokens must contain `sub` (user ID) and `role` claims.

| Role | Permitted actions |
|------|-------------------|
| `hr_admin` | All read operations + PATCH employee status/details |
| `manager` | All read operations + PATCH employee status/details |
| `it_admin` | All read operations + PATCH provisioning request status |

## Compliance

- **NIS2 Art.21** — all mutating actions written to `audit_log` with actor (derived from JWT), before/after state, IP, and user-agent; each mutation is atomic with its audit entry via DB transaction
- **SOC2 CC6.1** — document records are immutable after upload; no DELETE route for `contract` / `id_document` types
- **ISO27001 A.12.4** — structured JSON logs for SIEM ingestion
- **ISO27001 A.9.4** — authenticated session required for all API access; RBAC enforced at route level

## Development

```bash
cp ../../.env.example ../../.env
pnpm --filter @its/onboarding dev
```
