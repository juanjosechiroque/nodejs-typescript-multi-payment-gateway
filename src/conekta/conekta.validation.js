import Joi from "joi";

export const createOrderSchema = Joi.object({
    customer_name: Joi.string().required(),
    customer_email: Joi.string().email().required(),
    reference: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).uppercase().required(),
    success_url: Joi.string().uri().required(),
    failure_url: Joi.string().uri().required(),
});
