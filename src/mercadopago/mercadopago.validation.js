import Joi from "joi";

export const createOrderSchema = Joi.object({
    token: Joi.string().required(),
    issuer_id: Joi.string().optional(),
    installments: Joi.number().integer().min(1).required(),
    description: Joi.string().required(),
    transactionAmount: Joi.number().positive().required(),
    paymentMethodId: Joi.string().required(),
    payer: Joi.object({
        email: Joi.string().email().required(),
    }).required(),
});
