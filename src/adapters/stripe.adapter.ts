import Stripe from "stripe";
import { STRIPE_PRIVATE_KEY } from "../config.js";
import { GatewayError, BadRequestError } from "../errors.js";
import type { ChargeInput, ChargeResult, PaymentAdapter } from "./payment.adapter.js";

const client = new Stripe(STRIPE_PRIVATE_KEY, { apiVersion: "2026-06-24.dahlia" });

export class StripeAdapter implements PaymentAdapter {
    async charge(input: ChargeInput): Promise<ChargeResult> {
        const { token, amount, currency, customer_email, description, metadata, idempotencyKey } =
            input;

        try {
            const existing = await client.customers.list({ email: customer_email, limit: 1 });
            const customer =
                existing.data[0] ?? (await client.customers.create({ email: customer_email }));

            const intentParams: Stripe.PaymentIntentCreateParams = {
                payment_method: token,
                amount: Math.round((amount + Number.EPSILON) * 100),
                currency: currency.toLowerCase(),
                confirm: true,
                payment_method_types: ["card"],
                customer: customer.id,
            };

            if (description !== undefined) intentParams.description = description;
            if (metadata !== undefined) intentParams.metadata = metadata;

            const intent = await client.paymentIntents.create(intentParams, {
                idempotencyKey,
            });

            return {
                provider: "stripe",
                charge_id: intent.id,
                status: intent.status === "succeeded" ? "succeeded" : "pending",
                amount,
                currency: currency.toUpperCase(),
            };
        } catch (err) {
            if (err instanceof Stripe.errors.StripeCardError) throw GatewayError(err.message);
            if (err instanceof Stripe.errors.StripeInvalidRequestError) {
                if (err.param)
                    throw BadRequestError(`The parameter ${err.param} is invalid or missing`);
                throw GatewayError(err.message);
            }
            throw GatewayError("Stripe returned an unexpected error");
        }
    }
}
