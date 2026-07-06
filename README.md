# nodejs-typescript-multi-payment-gateway

A **TypeScript REST API** that integrates multiple payment providers under a single unified interface using the **adapter pattern**.

Built with Express 5, TypeScript, Zod validation, ESLint, and Prettier.

## Stack

- **TypeScript** — strict mode, ESM, Node.js 24+
- **Express 5** — HTTP layer
- **Zod** — schema validation with typed inference
- **Stripe** — card payments via PaymentIntents API (tokenized flow)
- **ESLint + Prettier** — enforced style and static analysis
- **Husky** — pre-commit validation hook
- **CI/CD** — GitHub Actions validates and builds on `main`

## Requirements

- Node.js 24+ (use `.nvmrc` with `nvm use`)
- npm
- A [Stripe account](https://stripe.com) — free, test mode available

## Quick Start

```bash
git clone https://github.com/juanjosechiroque/nodejs-typescript-multi-payment-gateway.git
cd nodejs-typescript-multi-payment-gateway
npm install
cp .env.example .env   # add your STRIPE_PRIVATE_KEY
npm run dev
```

The API listens on `http://localhost:3000` by default.

## Environment Variables

| Variable             | Required | Description                                        |
| -------------------- | -------- | -------------------------------------------------- |
| `PORT`               | No       | HTTP port (default `3000`)                         |
| `STRIPE_PRIVATE_KEY` | **Yes**  | Stripe secret key (`sk_test_...` or `sk_live_...`) |

## Available Scripts

| Script              | Description                      |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start dev server with hot reload |
| `npm start`         | Start production server          |
| `npm run build`     | Compile TypeScript to `dist/`    |
| `npm run typecheck` | Type-check without emitting      |
| `npm run validate`  | ESLint + Prettier check          |
| `npm run format`    | Format + ESLint --fix            |

## API Endpoints

All routes are mounted under `/api`.

### Health

#### `GET /api/health`

Returns server health status.

**Response:**

```json
{
    "status": "healthy",
    "uptime": 42.3,
    "timestamp": "2026-07-06T00:00:00.000Z"
}
```

### Payments

#### `POST /api/payments/charge`

Create a charge using a tokenized payment method. The `provider` field selects which gateway processes the payment.

**Request:**

```json
{
    "provider": "stripe",
    "token": "pm_card_visa",
    "amount": 100.0,
    "currency": "USD",
    "customer_email": "user@example.com",
    "description": "Order #1234"
}
```

**Response:**

```json
{
    "provider": "stripe",
    "charge_id": "pi_xxx",
    "status": "succeeded",
    "amount": 100.0,
    "currency": "USD"
}
```

**Fields:**

| Field            | Type   | Required | Description                              |
| ---------------- | ------ | -------- | ---------------------------------------- |
| `provider`       | string | Yes      | Payment provider (`stripe`)              |
| `token`          | string | Yes      | Tokenized payment method from the client |
| `amount`         | number | Yes      | Charge amount (positive, in major units) |
| `currency`       | string | Yes      | ISO 4217 currency code (e.g. `USD`)      |
| `customer_email` | string | Yes      | Customer email address                   |
| `description`    | string | No       | Charge description                       |
| `metadata`       | object | No       | Key-value string pairs                   |

### Testing without a frontend

Use these Stripe test payment method tokens in the `token` field:

| `token`                     | Result             |
| --------------------------- | ------------------ |
| `pm_card_visa`              | Success            |
| `pm_card_mastercard`        | Success            |
| `pm_card_chargeDeclined`    | Declined           |
| `pm_card_insufficientFunds` | Insufficient funds |

## Error Responses

All errors follow a consistent shape:

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

| Status | Code              | When                                    |
| ------ | ----------------- | --------------------------------------- |
| 400    | `BadRequestError` | Validation failure or invalid parameter |
| 404    | `NotFoundError`   | Route not found                         |
| 429    | —                 | Rate limit exceeded                     |
| 502    | `GatewayError`    | Payment provider returned an error      |

Stack traces are included in non-production environments only.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for layer responsibilities, folder structure, and design decisions.

## License

MIT
