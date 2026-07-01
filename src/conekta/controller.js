import conekta from "conekta";
import { CONEKTA_PRIVATE_KEY } from "../config.js";

conekta.api_key = CONEKTA_PRIVATE_KEY;
conekta.api_version = "2.0.0";

export const createOrder = async (req, res, next) => {
    let { customer_name, customer_email, reference, amount, currency, success_url, failure_url } =
        req.body;

    try {
        let customer = await conekta.Customer.create({
            name: customer_name,
            email: customer_email,
        });

        customer = customer.toObject();
        amount = amount * 100;

        const orderCreated = await conekta.Order.create({
            currency: currency,
            customer_info: {
                customer_id: customer.id,
            },
            line_items: [
                {
                    name: reference,
                    unit_price: amount,
                    quantity: 1,
                },
            ],
            checkout: {
                type: "HostedPayment",
                success_url: success_url,
                failure_url: failure_url,
                allowed_payment_methods: ["card"],
                multifactor_authentication: false,
                redirection_time: 4,
            },
        });

        const result = {
            checkout_id: orderCreated._json.checkout.id,
            order_id: orderCreated._json.id,
            redirect_url: orderCreated._json.checkout.url,
        };

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};
