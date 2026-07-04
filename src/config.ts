if (process.env.NODE_ENV !== "production") {
    const dotenv = await import("dotenv");
    dotenv.config();
}

const env = process.env;

const REQUIRED_ENV_VARS = ["STRIPE_PRIVATE_KEY"] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !String(env[key] ?? "").trim());
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
}

export const PORT = Number(env.PORT) || 3000;
export const NODE_ENV = env.NODE_ENV;
export const STRIPE_PRIVATE_KEY = env.STRIPE_PRIVATE_KEY as string;
export const RATE_LIMIT_WINDOW_MINUTES = Number(env.RATE_LIMIT_WINDOW_MINUTES) || 1;
export const RATE_LIMIT_MAX = Number(env.RATE_LIMIT_MAX) || 60;
export const LOG_LEVEL = env.LOG_LEVEL ?? "info";
