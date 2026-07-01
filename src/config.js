if (process.env.NODE_ENV !== "production") {
    const dotenv = await import("dotenv");
    dotenv.config();
}

const env = process.env;

const REQUIRED_ENV_VARS = ["STRIPE_PRIVATE_KEY", "CONEKTA_PRIVATE_KEY", "MERCADOPAGO_ACCESS_TOKEN"];

const missing = REQUIRED_ENV_VARS.filter((key) => !String(env[key] ?? "").trim());
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
}

export const PORT = Number(env.PORT) || 3000;
export const NODE_ENV = env.NODE_ENV;
export const STRIPE_PRIVATE_KEY = env.STRIPE_PRIVATE_KEY;
export const CONEKTA_PRIVATE_KEY = env.CONEKTA_PRIVATE_KEY;
export const MERCADOPAGO_ACCESS_TOKEN = env.MERCADOPAGO_ACCESS_TOKEN;
