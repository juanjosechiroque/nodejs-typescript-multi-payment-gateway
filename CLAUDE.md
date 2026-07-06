# CLAUDE.md

Architecture, patterns, and conventions are documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md). Read it before making any changes.

Provider capabilities are intentionally separated: Stripe uses direct charges, while PayPal uses checkout order creation and capture. Do not force all gateways into a single charge-only contract.

## Commands

```bash
npm run dev           # development server
npm run validate      # ESLint + Prettier check
npm run typecheck     # TypeScript typecheck
npm test              # e2e tests
npm run build         # compile TypeScript to dist/
npm run format        # auto-fix
```

## Before committing

```bash
npm run validate && npm run typecheck && npm run build && npm test
```

All checks must pass. Fix any failures before committing — do not skip hooks.
