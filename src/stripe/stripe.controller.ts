import type { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { STRIPE_PRIVATE_KEY } from "../config.js";
import { GatewayError, BadRequestError } from "../errors.js";
import type { ChargesBody } from "./stripe.validation.js";

const stripe = new Stripe(STRIPE_PRIVATE_KEY, { apiVersion: "2026-06-24.dahlia" });

export const charges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { payment_method_id, amount, currency_code, customer_email, description, metadata } =
        req.body as ChargesBody;

    try {
        const customer = await stripe.customers.create({ email: customer_email });

        const intentParams: Stripe.PaymentIntentCreateParams = {
            payment_method: payment_method_id,
            amount: Math.round(Number(amount) * 100),
            currency: currency_code,
            confirm: true,
            payment_method_types: ["card"],
            customer: customer.id,
        };

        if (description !== undefined) intentParams.description = description;
        if (metadata !== undefined) intentParams.metadata = metadata;

        const paymentIntent = await stripe.paymentIntents.create(intentParams);

        res.status(201).json({
            charge_id: paymentIntent.id,
            status: paymentIntent.status,
        });
    } catch (err) {
        if (err instanceof Stripe.errors.StripeCardError) {
            next(GatewayError(err.message));
            return;
        }
        if (err instanceof Stripe.errors.StripeInvalidRequestError) {
            const msg = err.param
                ? `The parameter ${err.param} is invalid or missing`
                : err.message;
            next(BadRequestError(msg));
            return;
        }
        next(err);
    }
};
