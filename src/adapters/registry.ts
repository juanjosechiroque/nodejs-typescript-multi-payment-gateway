import { StripeAdapter } from "./stripe.adapter.js";
import { PayPalAdapter } from "./paypal.adapter.js";
import { BadRequestError } from "../errors.js";
import type { CheckoutOrderAdapter, DirectChargeAdapter } from "./payment.adapter.js";

const chargeAdapters: Record<string, DirectChargeAdapter> = {
    stripe: new StripeAdapter(),
};

const checkoutOrderAdapters: Record<string, CheckoutOrderAdapter> = {
    paypal: new PayPalAdapter(),
};

export const SUPPORTED_CHARGE_PROVIDERS = Object.keys(chargeAdapters);
export const SUPPORTED_CHECKOUT_ORDER_PROVIDERS = Object.keys(checkoutOrderAdapters);

export function getChargeAdapter(provider: string): DirectChargeAdapter {
    const adapter = chargeAdapters[provider];
    if (!adapter) {
        throw BadRequestError(
            `Unsupported charge provider: "${provider}". Supported: ${SUPPORTED_CHARGE_PROVIDERS.join(", ")}`
        );
    }
    return adapter;
}

export function getCheckoutOrderAdapter(provider: string): CheckoutOrderAdapter {
    const adapter = checkoutOrderAdapters[provider];
    if (!adapter) {
        throw BadRequestError(
            `Unsupported checkout order provider: "${provider}". Supported: ${SUPPORTED_CHECKOUT_ORDER_PROVIDERS.join(", ")}`
        );
    }
    return adapter;
}
