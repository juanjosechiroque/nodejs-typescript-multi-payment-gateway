# Architecture

This document describes the structure, conventions, and design decisions behind this project.

## Stack

| Layer         | Technology          |
| ------------- | ------------------- |
| Runtime       | Node.js 24+ (ESM)   |
| Language      | TypeScript (strict) |
| Framework     | Express 5           |
| Validation    | Zod                 |
| Gateways      | Stripe + PayPal     |
| Logging       | Pino + pino-http    |
| Rate limiting | express-rate-limit  |
| Code quality  | ESLint + Prettier   |
| CI/CD         | GitHub Actions      |

## Project structure

```
src/
├── adapters/
│   ├── payment.adapter.ts     # Adapter capability interfaces + shared payment result types
│   ├── registry.ts            # Provider registry — maps names to charge/order adapter capabilities
│   ├── paypal.client.ts       # PayPal REST client for OAuth, order creation, and capture
│   ├── paypal.adapter.ts      # PayPal checkout order implementation
│   └── stripe.adapter.ts      # Stripe direct charge implementation
├── payments/
│   ├── payments.router.ts     # Route definitions + validation wiring
│   ├── payments.controller.ts # HTTP layer: reads req, calls service, sends response
│   ├── payments.service.ts    # Resolves adapter capabilities from registry
│   └── payments.validation.ts # Zod schemas + inferred request types
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

This project uses the **adapter pattern** to decouple the HTTP layer from any specific payment SDK or REST API. Providers implement the capability interface that matches their real payment flow:

```ts
interface DirectChargeAdapter {
    charge(input: ChargeInput): Promise<ChargeResult>;
}

interface CheckoutOrderAdapter {
    createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
    captureOrder(input: CaptureOrderInput): Promise<ChargeResult>;
}
```

The **registry** (`src/adapters/registry.ts`) is the single source of truth for available providers:

```ts
const chargeAdapters: Record<string, DirectChargeAdapter> = {
    stripe: new StripeAdapter(),
};

const checkoutOrderAdapters: Record<string, CheckoutOrderAdapter> = {
    paypal: new PayPalAdapter(),
};
```

Stripe uses the direct charge capability. PayPal uses checkout order creation and capture because its normal checkout flow requires customer approval before capture.

### Adding a new provider

1. Create `src/adapters/{name}.adapter.ts` implementing the right capability interface
2. Add `{name}: new {Name}Adapter()` to either `chargeAdapters` or `checkoutOrderAdapters` in `registry.ts`
3. Add provider-specific client code only inside `src/adapters/`

No router or controller changes are needed when adding a provider to an existing capability. New payment capabilities should add explicit routes instead of overloading an unrelated flow.

## Layer responsibilities and data flow

```
router → controller → service → adapter → external SDK/API
```

| Layer        | Responsibility                                                            | Must not                       |
| ------------ | ------------------------------------------------------------------------- | ------------------------------ |
| `router`     | Declare routes and attach route-level validation middleware               | Contain logic                  |
| `controller` | Read `req.body`, call service, map response, send JSON                    | Call SDKs directly             |
| `service`    | Resolve adapter capability from registry and delegate to it               | Handle HTTP concerns           |
| `adapter`    | Translate provider-specific SDK/API calls into normalized payment results | Leak SDK-specific types        |
| `validation` | Zod schema — validates and strips unknown fields at router level          | Contain business rules         |
| `middleware` | Shared: error formatting, input validation                                | Contain gateway-specific logic |

## Request validation

All routes apply `validate(schema)` before the controller runs:

```ts
router.post("/charge", validate(chargeSchema), createCharge);
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

Errors propagate to `errorGenericHandler` in `src/middleware/error.ts` via `next(err)` or through controller handlers wrapped with `asyncHandler`, which catches promise rejections automatically. Controllers never call `res.status().json()` for errors directly.

Adapters are responsible for normalizing SDK errors into typed errors before they reach the controller:

```ts
} catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) throw GatewayError(err.message);
    if (err instanceof Stripe.errors.StripeInvalidRequestError) throw BadRequestError(...);
    throw GatewayError("Stripe returned an unexpected error");
}
```

REST provider clients follow the same boundary. For example, PayPal OAuth, order creation, capture requests, HTTP errors, and `PayPal-Request-Id` handling stay inside `paypal.client.ts` / `paypal.adapter.ts`; controllers and services only see typed application errors and normalized payment results.

Error responses follow a consistent shape:

```json
{ "status": 502, "code": "GatewayError", "message": "Stripe returned an unexpected error" }
```

Stack traces are included only in non-production environments.

## Logging

`pino-http` in `src/app.ts` logs every request automatically. Logging is disabled when `NODE_ENV=test`. In development, logs are formatted with `pino-pretty`; in production, JSON output is written to stdout. The log level is controlled by `LOG_LEVEL` (default `info`).

## Testing

E2E tests live under `tests/e2e` and are written in a BDD-style `Given/When/Then` structure where it helps readability. External payment providers are mocked so CI does not depend on network calls or real provider credentials. CI runs `npm test`; coverage is available as a local/manual check with `npm run test:coverage`.

## Security

`helmet` sets secure HTTP headers on every response.

`express-rate-limit` is applied globally in `src/app.ts` (disabled when `NODE_ENV=test`, unless `FORCE_RATE_LIMIT_IN_TEST=true` for isolated tests). Default: 60 requests per 1-minute window per IP. Configure via `RATE_LIMIT_WINDOW_MINUTES` and `RATE_LIMIT_MAX`. Payment creation endpoints (`POST /api/payments/charge`, `POST /api/payments/orders`) use a dedicated stricter limiter in `src/payments/payments.router.ts`: 10 requests per minute per IP (hardcoded; mitigates card testing without affecting capture or health routes).

CORS is intentionally unrestricted: this API is consumed server-to-server (no browser clients or session cookies), so an origin allowlist does not apply unlike Helmet and rate limiting, which protect every request regardless of caller type.

The rate limiter store is in-memory, so counters are not shared across multiple instances when the service scales horizontally. Limits are keyed by IP only; they do not replace dedicated fraud detection tools such as Stripe Radar.

## Environment configuration

All environment variables are declared and validated with Zod at startup in `src/config.ts`. Missing or invalid required variables cause an immediate process exit with a readable validation summary. Feature code imports named constants from `config.ts` — never reads `process.env` directly.

| Variable                    | Required | Default   | Description                                                    |
| --------------------------- | -------- | --------- | -------------------------------------------------------------- |
| `STRIPE_PRIVATE_KEY`        | Yes      | —         | Stripe secret key                                              |
| `PAYPAL_CLIENT_ID`          | No       | —         | PayPal client id, required only when using PayPal manually     |
| `PAYPAL_CLIENT_SECRET`      | No       | —         | PayPal client secret, required only when using PayPal manually |
| `PAYPAL_ENVIRONMENT`        | No       | `sandbox` | PayPal environment                                             |
| `PORT`                      | No       | `3000`    | HTTP port                                                      |
| `RATE_LIMIT_WINDOW_MINUTES` | No       | `1`       | Rate limit window in minutes                                   |
| `RATE_LIMIT_MAX`            | No       | `60`      | Max requests per window                                        |
| `LOG_LEVEL`                 | No       | `info`    | Pino log level                                                 |
