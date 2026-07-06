# Architecture

This document describes the structure, conventions, and design decisions behind this project.

## Stack

| Layer         | Technology          |
| ------------- | ------------------- |
| Runtime       | Node.js 24+ (ESM)   |
| Language      | TypeScript (strict) |
| Framework     | Express 5           |
| Validation    | Zod                 |
| Gateways      | Stripe              |
| Logging       | Pino + pino-http    |
| Rate limiting | express-rate-limit  |
| Code quality  | ESLint + Prettier   |
| CI/CD         | GitHub Actions      |

## Project structure

```
src/
├── adapters/
│   ├── payment.adapter.ts     # PaymentAdapter interface + ChargeInput/ChargeResult types
│   ├── registry.ts            # Provider registry — maps name → adapter instance; exports SUPPORTED_PROVIDERS
│   └── stripe.adapter.ts      # Stripe implementation of PaymentAdapter
├── payments/
│   ├── payments.router.ts     # Route definitions + validation wiring
│   ├── payments.controller.ts # HTTP layer: reads req, calls service, sends response
│   ├── payments.service.ts    # Resolves adapter from registry, delegates charge
│   └── payments.validation.ts # Zod schema + inferred ChargeBody type
├── api/
│   └── health/
│       ├── health.router.ts
│       └── health.controller.ts
├── middleware/
│   ├── error.ts               # notFoundHandler + errorGenericHandler
│   └── validate.ts            # Shared Zod validation middleware
├── utils/
│   ├── asyncHandler.ts        # Wraps async controllers — forwards rejections to next()
│   └── logger.ts              # Pino logger instance (pretty output in development)
├── routes/
│   └── index.ts               # Mounts all routers under /api
├── app.ts                     # Express app setup
├── config.ts                  # Environment variable validation and exports
└── errors.ts                  # Typed error factories (AppError, BadRequestError, GatewayError...)
index.ts                       # Server entrypoint
.cursor/rules/                 # Cursor AI coding rules
```

## Adapter pattern

This project uses the **adapter pattern** to decouple the HTTP layer from any specific payment SDK. Each gateway implements the same `PaymentAdapter` interface:

```ts
interface PaymentAdapter {
    charge(input: ChargeInput): Promise<ChargeResult>;
}
```

The **registry** (`src/adapters/registry.ts`) is the single source of truth for available providers:

```ts
const adapters: Record<string, PaymentAdapter> = {
    stripe: new StripeAdapter(),
};
export const SUPPORTED_PROVIDERS = Object.keys(adapters);
export function getAdapter(provider: string): PaymentAdapter { ... }
```

`SUPPORTED_PROVIDERS` is imported directly into the Zod schema so validation and the registry stay in sync automatically — no duplication.

### Adding a new provider

1. Create `src/adapters/{name}.adapter.ts` implementing `PaymentAdapter`
2. Add `{name}: new {Name}Adapter()` to the `adapters` map in `registry.ts`
3. Done — the new provider is automatically validated by Zod and routable

No router changes, no controller changes, no new routes.

## Layer responsibilities and data flow

```
router → controller → service → adapter → external SDK
```

| Layer        | Responsibility                                                                    | Must not                       |
| ------------ | --------------------------------------------------------------------------------- | ------------------------------ |
| `router`     | Declare routes, attach `validate()` middleware, wrap handlers with `asyncHandler` | Contain logic                  |
| `controller` | Read `req.body`, call service, map response, send JSON                            | Call SDKs directly             |
| `service`    | Resolve adapter from registry, delegate to `adapter.charge()`                     | Handle HTTP concerns           |
| `adapter`    | Translate `ChargeInput` → SDK call → `ChargeResult`; normalize SDK errors         | Leak SDK-specific types        |
| `validation` | Zod schema — validates and strips unknown fields at router level                  | Contain business rules         |
| `middleware` | Shared: error formatting, input validation                                        | Contain gateway-specific logic |

## Request validation

All routes apply `validate(schema)` before the controller runs:

```ts
router.post("/charge", validate(chargeSchema), asyncHandler(createCharge));
```

Zod schemas export an inferred type used directly in controllers — no duplicate interface definitions:

```ts
export const chargeSchema = z.object({ ... });
export type ChargeBody = z.infer<typeof chargeSchema>;
```

Validation errors return `400` with a `details` array listing every failing field:

```json
{
    "status": 400,
    "code": "BadRequestError",
    "message": "Validation failed",
    "details": [
        { "field": "amount", "message": "Number must be greater than 0" },
        { "field": "customer_email", "message": "Invalid email" }
    ]
}
```

## Error handling

Typed error factories live in `src/errors.ts`:

```ts
throw BadRequestError("Invalid card number");
throw GatewayError("Stripe returned an unexpected error");
throw NotFoundError("Resource not found");
```

Errors propagate to `errorGenericHandler` in `src/middleware/error.ts` via `next(err)` or through `asyncHandler`, which catches promise rejections automatically. Controllers never call `res.status().json()` for errors directly.

Adapters are responsible for normalizing SDK errors into typed errors before they reach the controller:

```ts
} catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) throw GatewayError(err.message);
    if (err instanceof Stripe.errors.StripeInvalidRequestError) throw BadRequestError(...);
    throw GatewayError("Stripe returned an unexpected error");
}
```

Error responses follow a consistent shape:

```json
{ "status": 502, "code": "GatewayError", "message": "Stripe returned an unexpected error" }
```

Stack traces are included only in non-production environments.

## Logging

`pino-http` in `src/app.ts` logs every request automatically. Logging is disabled when `NODE_ENV=test`. In development, logs are formatted with `pino-pretty`; in production, JSON output is written to stdout. The log level is controlled by `LOG_LEVEL` (default `info`).

## Rate limiting

`express-rate-limit` is applied globally in `src/app.ts` (disabled when `NODE_ENV=test`). Defaults: 60 requests per 1-minute window. Configure via `RATE_LIMIT_WINDOW_MINUTES` and `RATE_LIMIT_MAX`.

## Environment configuration

All environment variables are declared and validated at startup in `src/config.ts`. Missing required variables cause an immediate process exit. Feature code imports named constants from `config.ts` — never reads `process.env` directly.

| Variable                    | Required | Default | Description                  |
| --------------------------- | -------- | ------- | ---------------------------- |
| `STRIPE_PRIVATE_KEY`        | Yes      | —       | Stripe secret key            |
| `PORT`                      | No       | `3000`  | HTTP port                    |
| `RATE_LIMIT_WINDOW_MINUTES` | No       | `1`     | Rate limit window in minutes |
| `RATE_LIMIT_MAX`            | No       | `60`    | Max requests per window      |
| `LOG_LEVEL`                 | No       | `info`  | Pino log level               |
