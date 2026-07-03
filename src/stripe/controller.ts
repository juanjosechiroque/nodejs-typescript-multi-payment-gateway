import type { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { STRIPE_PRIVATE_KEY } from "../config.js";
import { GatewayError, BadRequestError } from "../errors.js";
import type { ChargesBody } from "./stripe.validation.js";

const stripe = new Stripe(STRIPE_PRIVATE_KEY, { apiVersion: "2022-11-15" });

export const charges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
        card_number,
        expiry_month,
        expiry_year,
        cvc,
        amount,
        currency_code,
        customer_email,
        description,
        metadata,
    } = req.body as ChargesBody;

    try {
        const customer = await stripe.customers.create({ email: customer_email });

        const paymentMethod = await stripe.paymentMethods.create({
            type: "card",
            card: {
                number: card_number,
                exp_month: expiry_month,
                exp_year: expiry_year,
                cvc,
            },
        });

        const intentParams: Stripe.PaymentIntentCreateParams = {
            payment_method: paymentMethod.id,
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
        const stripeErr = err as Stripe.errors.StripeError;
        if (stripeErr.type === "StripeCardError") {
            next(GatewayError(stripeErr.message));
            return;
        }
        if (stripeErr.type === "StripeInvalidRequestError") {
            const msg = stripeErr.param
                ? `The parameter ${stripeErr.param} is invalid or missing`
                : stripeErr.message;
            next(BadRequestError(msg));
            return;
        }
        next(err);
    }
};
