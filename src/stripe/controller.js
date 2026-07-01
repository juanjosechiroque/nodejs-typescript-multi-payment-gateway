import Stripe from "stripe";
import { STRIPE_PRIVATE_KEY } from "../config.js";

const stripe = new Stripe(STRIPE_PRIVATE_KEY);

export const charges = async (req, res, next) => {
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
    } = req.body;

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

        const paymentIntent = await stripe.paymentIntents.create({
            payment_method: paymentMethod.id,
            amount: Math.round(Number(amount) * 100),
            currency: currency_code,
            confirm: true,
            payment_method_types: ["card"],
            customer: customer.id,
            description,
            metadata,
        });

        res.status(201).json({
            charge_id: paymentIntent.id,
            status: paymentIntent.status,
            receipt_url: paymentIntent.charges?.data[0]?.receipt_url ?? null,
        });
    } catch (err) {
        if (err.type === "StripeCardError" || err.type === "StripeInvalidRequestError") {
            err.status = err.param ? 400 : err.statusCode;
            if (err.param) {
                err.message = `The parameter ${err.param} is invalid or missing`;
            }
        }
        next(err);
    }
};
