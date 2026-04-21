# Employee Onboarding Portal — Web UI

React frontend for the HR onboarding platform. Provides HR teams and managers with a dashboard to manage new-hire onboarding checklists, document records, and provisioning requests.

## Stack

- **Framework**: React 18 + TypeScript
- **Router**: React Router v6
- **Build**: Vite 5
- **Port**: `5175` (configurable via `--port`)
- **API**: proxied to `apps/onboarding` on port `3002`

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | HR Dashboard | Employee list with status, checklist progress, doc count, provisioning status |
| `/employees/new` | New Hire | Form to register a new employee (auto-seeds checklist + provisioning) |
| `/employees/:id` | Employee Detail | Checklist management, provisioning status updates, document list |

## Development

```bash
# Start API first
pnpm --filter @its/onboarding dev

# Start UI
pnpm --filter @its/onboarding-web dev
```

The Vite dev server proxies `/api/onboarding/*` to `http://localhost:3002`.
