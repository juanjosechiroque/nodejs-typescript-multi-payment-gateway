export interface ChargeInput {
    token: string;
    amount: number;
    currency: string;
    customer_email: string;
    description?: string;
    metadata?: Record<string, string>;
    idempotencyKey: string;
}

export interface ChargeResult {
    provider: string;
    charge_id: string;
    status: "succeeded" | "pending";
    amount: number;
    currency: string;
}

export interface CreateOrderInput {
    amount: number;
    currency: string;
    customer_email: string;
    description?: string;
    metadata?: Record<string, string>;
    idempotencyKey: string;
}

export interface CreateOrderResult {
    provider: string;
    provider_order_id: string;
    status: "pending";
    amount: number;
    currency: string;
    approval_url?: string;
}

export interface CaptureOrderInput {
    providerOrderId: string;
    idempotencyKey: string;
}

export interface DirectChargeAdapter {
    charge(input: ChargeInput): Promise<ChargeResult>;
}

export interface CheckoutOrderAdapter {
    createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
    captureOrder(input: CaptureOrderInput): Promise<ChargeResult>;
}
