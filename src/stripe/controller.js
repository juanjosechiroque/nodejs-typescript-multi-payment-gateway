import Stripe from "stripe";
import { STRIPE_PRIVATE_KEY } from "../config.js";
const stripe = new Stripe(STRIPE_PRIVATE_KEY);

const setCustomError = (err) => {
    if (["StripeCardError", "StripeInvalidRequestError"].includes(err.type)) {
        err.status = err.status || err.statusCode;
        if (err.param) {
            err.status = 400;
            err.message = `The parameter ${err.param} is invalid or missing`;
        }
        err.code = err.raw.code || "stripe_error";
    }
};

export const charges = async (req, res, next) => {
    let {
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
        const customer = await stripe.customers.create({
            email: customer_email,
        });

        const paymentMethod = await stripe.paymentMethods.create({
            type: "card",
            card: {
                number: card_number,
                exp_month: expiry_month,
                exp_year: expiry_year,
                cvc: cvc,
            },
        });

        amount = amount * 100;

        const paymentIntent = await stripe.paymentIntents.create({
            payment_method: paymentMethod.id,
            amount: amount,
            currency: currency_code,
            confirm: true,
            payment_method_types: ["card"],
            customer: customer.id,
            description: description,
            metadata: metadata,
        });

        const result = {
            charge_id: paymentIntent.id,
            status: paymentIntent.status,
            receipt_url: paymentIntent.charges?.data[0]?.receipt_url,
        };

        console.log(JSON.stringify(paymentIntent, null, 4));
        res.status(201).json(result);
    } catch (err) {
        setCustomError(err);
        next(err);
    }
};
