import { z } from "zod";
import { GatewayError } from "./errors.js";

if (process.env.NODE_ENV !== "production") {
    const dotenv = await import("dotenv");
    dotenv.config();
}

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    STRIPE_PRIVATE_KEY: z.string().trim().min(1, "STRIPE_PRIVATE_KEY is required"),
    PAYPAL_CLIENT_ID: z.string().trim().min(1).optional(),
    PAYPAL_CLIENT_SECRET: z.string().trim().min(1).optional(),
    PAYPAL_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
    LOG_LEVEL: z.string().trim().min(1).default("info"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error("Invalid environment configuration");
    console.error(z.prettifyError(parsedEnv.error));
    process.exit(1);
}

export const {
    PORT,
    NODE_ENV,
    STRIPE_PRIVATE_KEY,
    PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET,
    PAYPAL_ENVIRONMENT,
    RATE_LIMIT_WINDOW_MINUTES,
    RATE_LIMIT_MAX,
    LOG_LEVEL,
} = parsedEnv.data;

export function getPayPalConfig() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw GatewayError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required to use PayPal");
    }

    return {
        clientId: PAYPAL_CLIENT_ID,
        clientSecret: PAYPAL_CLIENT_SECRET,
        baseUrl:
            PAYPAL_ENVIRONMENT === "production"
                ? "https://api-m.paypal.com"
                : "https://api-m.sandbox.paypal.com",
    };
}
