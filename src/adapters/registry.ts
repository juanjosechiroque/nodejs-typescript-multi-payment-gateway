import { StripeAdapter } from "./stripe.adapter.js";
import { BadRequestError } from "../errors.js";
import type { PaymentAdapter } from "./payment.adapter.js";

const adapters: Record<string, PaymentAdapter> = {
    stripe: new StripeAdapter(),
};

export const SUPPORTED_PROVIDERS = Object.keys(adapters);

export function getAdapter(provider: string): PaymentAdapter {
    const adapter = adapters[provider];
    if (!adapter) {
        throw BadRequestError(
            `Unsupported provider: "${provider}". Supported: ${SUPPORTED_PROVIDERS.join(", ")}`
        );
    }
    return adapter;
}
