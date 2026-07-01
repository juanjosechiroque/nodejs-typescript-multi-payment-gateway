import Joi from "joi";

export const chargesSchema = Joi.object({
    card_number: Joi.string().creditCard().required(),
    expiry_month: Joi.number().integer().min(1).max(12).required(),
    expiry_year: Joi.number().integer().min(new Date().getFullYear()).required(),
    cvc: Joi.string().min(3).max(4).required(),
    amount: Joi.number().positive().required(),
    currency_code: Joi.string().length(3).uppercase().required(),
    customer_email: Joi.string().email().required(),
    description: Joi.string().optional(),
    metadata: Joi.object().optional(),
});
