# Architecture

This document describes the structure, conventions, and design decisions behind this project.

## Stack

| Layer        | Technology                    |
| ------------ | ----------------------------- |
| Runtime      | Node.js 24+ (ESM)             |
| Framework    | Express 5                     |
| Validation   | Joi                           |
| Gateways     | Stripe, Mercado Pago, Conekta |
| Code quality | ESLint + Prettier             |

## Project structure

```
src/
├── stripe/                    # Stripe integration
│   ├── routes.js              # Route definitions + validation wiring
│   ├── controller.js          # HTTP layer: reads req, calls SDK, sends response
│   └── stripe.validation.js   # Joi schema for stripe requests
├── mercadopago/               # Mercado Pago integration
│   ├── routes.js
│   ├── controller.js
│   └── mercadopago.validation.js
├── conekta/                   # Conekta integration
│   ├── routes.js
│   ├── controller.js
│   └── conekta.validation.js
├── middleware/
│   ├── error.js               # notFoundHandler + errorGenericHandler
│   └── validate.js            # Shared Joi validation middleware
├── routes/
│   └── index.js               # Mounts all gateway routers under /api
├── app.js                     # Express app setup
├── config.js                  # Environment variable validation and exports
└── errors.js                  # Typed error factories
index.js                       # Server entrypoint
.cursor/rules/                 # Cursor AI coding rules (points to ARCHITECTURE.md)
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
| `validation` | Joi schema — validates and strips unknown fields at router level | Contain business rules         |
| `middleware` | Shared: error formatting, input validation                       | Contain gateway-specific logic |

## Request validation

All routes apply `validate(schema)` before the controller runs:

```js
router.post("/charges", validate(chargesSchema), charges);
```

Validation errors return `400` with a `details` array:

```json
{
    "status": 400,
    "code": "ValidationError",
    "message": "Validation failed",
    "details": [{ "field": "amount", "message": "\"amount\" must be a positive number" }]
}
```

## Response shape

Gateway responses are returned directly from the controller without a common envelope, since each provider has its own meaningful response structure.

Error responses flow through `errorGenericHandler` in `src/middleware/error.js`:

```json
{ "status": 500, "code": "InternalServerError", "message": "Internal server error" }
```

Stack traces are included only in non-production environments.

## Environment configuration

All environment variables are declared and validated at startup in `src/config.js`. Missing required variables cause an immediate process exit. Feature code imports named constants from `config.js` — never reads `process.env` directly.

## Error handling

Typed error factories live in `src/errors.js`:

```js
throw BadRequestError("Invalid card number");
throw GatewayError("Stripe returned an unexpected error");
throw NotFoundError("Resource not found");
```

Errors propagate to `errorGenericHandler` in `src/middleware/error.js` via `next(err)`. Controllers never call `res.status().json()` for errors directly.

## Why no service or DAO layer

This project has no database, so the `service → dao → model` layers that appear in CRUD APIs are not needed. Controllers delegate directly to the external SDK. If provider logic grows complex enough to warrant abstraction, a `service` layer can be introduced between the controller and the SDK call.
