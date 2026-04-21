# Contributing

## Branch naming

```
feat/<ticket-id>-short-description
fix/<ticket-id>-short-description
chore/<ticket-id>-short-description
```

Example: `feat/itsaa-5-onboarding-checklist`

## Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`

## PR checklist

- [ ] Linked to a Paperclip issue
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] No secrets committed
- [ ] Migration included if schema changed
- [ ] README updated if API surface changed

## Branch protection

`main` is protected:
- All CI checks must pass
- At least one review required
- No force-pushes
- Signed commits required

## Local setup

```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install

# Run all checks
pnpm lint && pnpm typecheck && pnpm test
```

## Security

- Never commit `.env` files — use `.env.example` with dummy values
- Report vulnerabilities via Paperclip to the CTO, not in public issues
- Run `pnpm audit` before merging dependency updates
