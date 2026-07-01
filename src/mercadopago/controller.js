import mercadopago from "mercadopago";
import { MERCADOPAGO_ACCESS_TOKEN } from "../config.js";

export const createOrder = async (req, res, next) => {
    try {
        const { payment } = mercadopago;
        let { configurations } = mercadopago;

        configurations.setAccessToken(MERCADOPAGO_ACCESS_TOKEN);

        const paymentData = {
            token: req.body.token,
            issuer_id: req.body.issuer_id,
            installments: req.body.installments,
            description: req.body.description,
            transaction_amount: req.body.transactionAmount,
            payment_method_id: req.body.paymentMethodId,
            payer: {
                email: req.body.payer.email,
            },
        };

        const response = await payment.save(paymentData);
        const { status, status_detail, id } = response.body;
        return res.status(response.status).json({ status, status_detail, id });
    } catch (err) {
        next(err);
    }
};
