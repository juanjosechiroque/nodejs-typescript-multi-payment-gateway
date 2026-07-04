# Architecture

This document describes the structure, conventions, and design decisions behind this project.

## Stack

| Layer        | Technology          |
| ------------ | ------------------- |
| Runtime      | Node.js 24+ (ESM)   |
| Language     | TypeScript (strict) |
| Framework    | Express 5           |
| Validation   | Zod                 |
| Gateways     | Stripe              |
| Code quality | ESLint + Prettier   |

## Project structure

```
src/
├── stripe/
│   ├── stripe.routes.ts       # Route definitions + validation wiring
│   ├── stripe.controller.ts   # HTTP layer: reads req, calls SDK, sends response
│   └── stripe.validation.ts   # Zod schema + inferred ChargesBody type
├── middleware/
│   ├── error.ts               # notFoundHandler + errorGenericHandler
│   └── validate.ts            # Shared Zod validation middleware
├── routes/
│   └── index.ts               # Mounts all routers under /api
├── app.ts                     # Express app setup
├── config.ts                  # Environment variable validation and exports
└── errors.ts                  # Typed error factories (AppError, BadRequestError, GatewayError...)
index.ts                       # Server entrypoint
.cursor/rules/                 # Cursor AI coding rules
```

## Layer responsibilities and data flow

```
router → controller → external SDK
```

This project has no database. The data flow is simpler than a CRUD API:

| Layer        | Responsibility                                                   | Must not                       |
| ------------ | ---------------------------------------------------------------- | ------------------------------ |
| `router`     | Declare routes, attach `validate()` middleware                   | Contain logic                  |
| `controller` | Read `req.body`, call SDK, map response, send JSON               | Call other controllers         |
| `validation` | Zod schema — validates and strips unknown fields at router level | Contain business rules         |
| `middleware` | Shared: error formatting, input validation                       | Contain gateway-specific logic |

## Request validation

All routes apply `validate(schema)` before the controller runs:

```ts
router.post("/charges", validate(chargesSchema), charges);
```

Zod schemas export an inferred type used directly in controllers — no duplicate interface definitions:

```ts
export const chargesSchema = z.object({ ... });
export type ChargesBody = z.infer<typeof chargesSchema>;
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

Errors propagate to `errorGenericHandler` in `src/middleware/error.ts` via `next(err)`. Controllers never call `res.status().json()` for errors directly.

Error responses follow a consistent shape:

```json
{ "status": 502, "code": "GatewayError", "message": "Stripe returned an unexpected error" }
```

Stack traces are included only in non-production environments.

## Environment configuration

All environment variables are declared and validated at startup in `src/config.ts`. Missing required variables cause an immediate process exit. Feature code imports named constants from `config.ts` — never reads `process.env` directly.

## Why no service or DAO layer

This project has no database, so the `service → dao → model` layers that appear in CRUD APIs are not needed. Controllers delegate directly to the external SDK. When the adapter pattern is introduced for multi-provider support, a `service` layer will sit between the controller and the adapters.
