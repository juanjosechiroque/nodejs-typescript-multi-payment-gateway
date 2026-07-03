# nodejs-typescript-multi-payment-gateway

A **TypeScript REST API** that integrates multiple payment providers under a single unified interface using the **adapter pattern**.

Built with Express 5, TypeScript, Zod validation, ESLint, and Prettier.

## Stack

- **TypeScript** — strict mode, ESM, Node.js 24+
- **Express 5** — HTTP layer
- **Zod** — schema validation with typed inference
- **Stripe** — card payments via PaymentIntents API
- **ESLint + Prettier** — enforced style and static analysis
- **Husky** — pre-commit validation hook

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

### Stripe

#### `POST /api/stripe/charges`

Create a card charge using raw card data (test mode only).

**Request:**

```json
{
    "card_number": "4242424242424242",
    "expiry_month": 12,
    "expiry_year": 2026,
    "cvc": "123",
    "amount": 100.0,
    "currency_code": "USD",
    "customer_email": "user@example.com",
    "description": "Order #1234"
}
```

**Response:**

```json
{
    "charge_id": "pi_xxx",
    "status": "succeeded"
}
```

### Test Cards (Stripe test mode)

| Card number        | Result             |
| ------------------ | ------------------ |
| `4242424242424242` | Success            |
| `4000000000000002` | Declined           |
| `4000000000009995` | Insufficient funds |

Use any future expiry date and any 3-digit CVC.

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

Stack traces are included in non-production environments only.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for layer responsibilities, folder structure, and design decisions.

## License

MIT
