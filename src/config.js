import { config } from "dotenv";
config({ silent: process.env.NODE_ENV != "production" });

export const PORT = process.env.PORT;
export const NODE_ENV = process.env.NODE_ENV;
export const STRIPE_PRIVATE_KEY = process.env.STRIPE_PRIVATE_KEY;
export const CONEKTA_PRIVATE_KEY = process.env.CONEKTA_PRIVATE_KEY;
export const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
