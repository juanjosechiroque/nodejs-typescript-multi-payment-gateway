import { getAdapter } from "../adapters/registry.js";
import type { ChargeInput, ChargeResult } from "../adapters/payment.adapter.js";

export interface PaymentChargeInput extends ChargeInput {
    provider: string;
}

export async function charge(input: PaymentChargeInput): Promise<ChargeResult> {
    const adapter = getAdapter(input.provider);
    return adapter.charge(input);
}
