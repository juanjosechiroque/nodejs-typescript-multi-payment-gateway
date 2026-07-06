import { GatewayError } from "../errors.js";
import type {
    CaptureOrderInput,
    ChargeResult,
    CheckoutOrderAdapter,
    CreateOrderInput,
    CreateOrderResult,
} from "./payment.adapter.js";
import { PayPalClient, type PayPalOrderResponse } from "./paypal.client.js";

export class PayPalAdapter implements CheckoutOrderAdapter {
    constructor(private readonly client = new PayPalClient()) {}

    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
        const order = await this.client.createOrder(input);
        const approvalUrl = order.links?.find((link) => link.rel === "approve")?.href;

        return {
            provider: "paypal",
            provider_order_id: order.id,
            status: "pending",
            amount: input.amount,
            currency: input.currency.toUpperCase(),
            ...(approvalUrl !== undefined && { approval_url: approvalUrl }),
        };
    }

    async captureOrder(input: CaptureOrderInput): Promise<ChargeResult> {
        const order = await this.client.captureOrder(input.providerOrderId, input.idempotencyKey);
        const capture = getFirstCapture(order);

        if (order.status === "COMPLETED") {
            return {
                provider: "paypal",
                charge_id: capture?.id ?? order.id,
                status: "succeeded",
                amount: Number(capture?.amount?.value ?? 0),
                currency: capture?.amount?.currency_code.toUpperCase() ?? "USD",
            };
        }

        if (["CREATED", "APPROVED", "PENDING"].includes(order.status)) {
            return {
                provider: "paypal",
                charge_id: capture?.id ?? order.id,
                status: "pending",
                amount: Number(capture?.amount?.value ?? 0),
                currency: capture?.amount?.currency_code.toUpperCase() ?? "USD",
            };
        }

        throw GatewayError(`PayPal order capture failed with status ${order.status}`);
    }
}

function getFirstCapture(order: PayPalOrderResponse) {
    return order.purchase_units?.at(0)?.payments?.captures?.at(0);
}
