# Payment Gateway API

A **Node.js REST API** that integrates three payment providers — **Stripe**, **Mercado Pago**, and **Conekta** — under a single Express application.

Built with Express 5, Joi validation, ESLint, Prettier, and structured for production use.

## Features

- ⚡ **JavaScript (ESM)** — native modules, Node.js 24+
- 🚀 **Express 5** — HTTP layer
- 💳 **Stripe** — card charges via PaymentIntents API
- 💳 **Mercado Pago** — payment processing
- 💳 **Conekta** — hosted payment pages
- 📋 **Joi** — request validation on all routes
- 📝 **ESLint & Prettier** — enforced style and static checks

## Requirements

- Node.js 24+ (use `.nvmrc` with `nvm use` to pin the version automatically)
- npm

## Quick Start

1. **Clone the repository**

    ```bash
    git clone <your-repo-url>
    cd nodejs-api-payment-gateway
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Set up environment**

    ```bash
    cp .env.example .env
    # Fill in your gateway credentials
    ```

4. **Start the development server**

    ```bash
    npm run dev
    ```

    The API listens on port `3000` by default.

## Available Scripts

| Script             | Description             |
| ------------------ | ----------------------- |
| `npm start`        | Start server            |
| `npm run dev`      | Start dev server        |
| `npm run validate` | ESLint + Prettier check |
| `npm run format`   | Format + ESLint --fix   |

## Environment Variables

Copy `.env.example` to `.env`:

| Variable                   | Required | Description                  |
| -------------------------- | -------- | ---------------------------- |
| `PORT`                     | No       | HTTP port (default `3000`)   |
| `STRIPE_PRIVATE_KEY`       | **Yes**  | Stripe secret key (`sk_...`) |
| `CONEKTA_PRIVATE_KEY`      | **Yes**  | Conekta private key          |
| `MERCADOPAGO_ACCESS_TOKEN` | **Yes**  | Mercado Pago access token    |

The app exits at startup if any required variable is missing or empty.

## API Endpoints

All routes are mounted under `/api`.

### Stripe

- `POST /api/stripe/charges` — create a card charge

**Request body:**

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
    "status": "succeeded",
    "receipt_url": "https://pay.stripe.com/receipts/..."
}
```

### Mercado Pago

- `POST /api/mercadopago/payments` — create a payment

**Request body:**

```json
{
    "token": "card_token",
    "issuer_id": "12345",
    "installments": 1,
    "description": "Order #1234",
    "transactionAmount": 100.0,
    "paymentMethodId": "visa",
    "payer": { "email": "user@example.com" }
}
```

### Conekta

- `POST /api/conekta/order` — create a hosted payment order

**Request body:**

```json
{
    "customer_name": "John Doe",
    "customer_email": "user@example.com",
    "reference": "Order #1234",
    "amount": 100.0,
    "currency": "MXN",
    "success_url": "https://yoursite.com/success",
    "failure_url": "https://yoursite.com/failure"
}
```

**Response:**

```json
{
    "checkout_id": "checkout_xxx",
    "order_id": "ord_xxx",
    "redirect_url": "https://pay.conekta.com/..."
}
```

## Error Responses

All errors follow a consistent shape:

```json
{
    "status": 400,
    "code": "ValidationError",
    "message": "Validation failed",
    "details": [{ "field": "amount", "message": "\"amount\" must be a positive number" }]
}
```

Stack traces are included in non-production environments only.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for layer responsibilities, folder structure, and conventions.

### AI-assisted development

| Tool   | File                                 |
| ------ | ------------------------------------ |
| Cursor | [`.cursor/rules/`](./.cursor/rules/) |

## License

MIT
