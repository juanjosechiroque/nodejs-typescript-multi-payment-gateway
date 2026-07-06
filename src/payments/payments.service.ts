import { getChargeAdapter, getCheckoutOrderAdapter } from "../adapters/registry.js";
import type {
    CaptureOrderInput,
    ChargeInput,
    ChargeResult,
    CreateOrderInput,
    CreateOrderResult,
} from "../adapters/payment.adapter.js";

export interface PaymentChargeInput extends ChargeInput {
    provider: string;
}

export interface PaymentCreateOrderInput extends CreateOrderInput {
    provider: string;
}

export interface PaymentCaptureOrderInput extends CaptureOrderInput {
    provider: string;
}

export async function charge(input: PaymentChargeInput): Promise<ChargeResult> {
    const adapter = getChargeAdapter(input.provider);
    return adapter.charge(input);
}

export async function createCheckoutOrder(
    input: PaymentCreateOrderInput
): Promise<CreateOrderResult> {
    const adapter = getCheckoutOrderAdapter(input.provider);
    return adapter.createOrder(input);
}

export async function captureCheckoutOrder(input: PaymentCaptureOrderInput): Promise<ChargeResult> {
    const adapter = getCheckoutOrderAdapter(input.provider);
    return adapter.captureOrder(input);
}
