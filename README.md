# nodejs-typescript-multi-payment-gateway

A **TypeScript REST API** that integrates multiple payment providers under a single unified interface using the **adapter pattern**.

Built with Express 5, TypeScript, Zod validation, Pino logging, ESLint, and Prettier.

## Stack

- **TypeScript** — strict mode, ESM, Node.js 24+
- **Express 5** — HTTP layer
- **Zod** — schema validation with typed inference
- **Stripe** — direct card charges via PaymentIntents API (tokenized flow)
- **PayPal** — checkout order creation and capture flow
- **Pino** — structured request and application logging
- **ESLint + Prettier** — enforced style and static analysis
- **Husky** — pre-commit validation hook
- **CI/CD** — GitHub Actions validates, tests, and builds on `main`

## Requirements

- Node.js 24+ (use `.nvmrc` with `nvm use`)
- npm
- Provider sandbox credentials for the flows you want to run manually:
    - [Stripe](https://stripe.com) for direct charges
    - [PayPal Developer](https://developer.paypal.com/) for checkout orders

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

| Variable               | Required | Description                                                         |
| ---------------------- | -------- | ------------------------------------------------------------------- |
| `PORT`                 | No       | HTTP port (default `3000`)                                          |
| `STRIPE_PRIVATE_KEY`   | **Yes**  | Stripe secret key (`sk_test_...` or `sk_live_...`)                  |
| `PAYPAL_CLIENT_ID`     | No       | PayPal client id, required only when using `provider: "paypal"`     |
| `PAYPAL_CLIENT_SECRET` | No       | PayPal client secret, required only when using `provider: "paypal"` |
| `PAYPAL_ENVIRONMENT`   | No       | `sandbox` or `production` (default `sandbox`)                       |

`STRIPE_PRIVATE_KEY` is required at startup because Stripe is the default direct-charge provider. PayPal credentials are only required when using the PayPal checkout order flow manually. Tests mock external providers, so CI uses a mock Stripe key and does not require real Stripe or PayPal credentials.

## Available Scripts

| Script              | Description                      |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start dev server with hot reload |
| `npm start`         | Start production server          |
| `npm run build`     | Compile TypeScript to `dist/`    |
| `npm run typecheck` | Type-check without emitting      |
| `npm test`          | Run e2e tests with Vitest        |
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

Create a direct charge using a tokenized payment method. This flow is used by providers that can authorize and confirm the payment server-side, such as Stripe.

Required header:

```http
Idempotency-Key: 7f8f40e7-8f7a-4c0c-9f2f-4f20c62d3c62
```

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

3-decimal currencies (BHD, KWD, OMR, JOD, TND, LYD) are explicitly rejected — provider support is undocumented, not assumed.

The `Idempotency-Key` header is required and must be a valid UUID. It is forwarded to Stripe so safe retries do not create duplicate charges.

#### `POST /api/payments/orders`

Create a checkout order for providers that require customer approval before capture, such as PayPal.

Required header:

```http
Idempotency-Key: 7f8f40e7-8f7a-4c0c-9f2f-4f20c62d3c62
```

**Request:**

```json
{
    "provider": "paypal",
    "amount": 100.0,
    "currency": "USD",
    "customer_email": "user@example.com",
    "description": "Order #1234"
}
```

**Response:**

```json
{
    "provider": "paypal",
    "provider_order_id": "5O190127TN364715T",
    "status": "pending",
    "amount": 100.0,
    "currency": "USD",
    "approval_url": "https://www.paypal.com/checkoutnow?token=..."
}
```

#### `POST /api/payments/orders/:provider/:providerOrderId/capture`

Capture a checkout order after the customer approves it with the provider.

Required header:

```http
Idempotency-Key: 7f8f40e7-8f7a-4c0c-9f2f-4f20c62d3c62
```

**Response:**

```json
{
    "provider": "paypal",
    "charge_id": "2GG279541U471931P",
    "status": "succeeded",
    "amount": 100.0,
    "currency": "USD"
}
```

The same public API supports different provider capabilities: Stripe uses the direct charge flow, while PayPal uses checkout order creation and capture.

### Testing without a frontend

Use these Stripe test payment method tokens in the `token` field:

| `token`                                   | Result             |
| ----------------------------------------- | ------------------ |
| `pm_card_visa`                            | Success            |
| `pm_card_mastercard`                      | Success            |
| `pm_card_chargeDeclined`                  | Card declined      |
| `pm_card_chargeDeclinedExpiredCard`       | Card expired       |
| `pm_card_chargeDeclinedInsufficientFunds` | Insufficient funds |

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

## Testing

E2E tests use Vitest and Supertest with a BDD-style structure. Stripe and PayPal clients are mocked in the payments e2e suites so tests are deterministic and can run in CI without external network calls or real provider credentials.

Run coverage locally with:

```bash
npm run test:coverage
```

## License

MIT
