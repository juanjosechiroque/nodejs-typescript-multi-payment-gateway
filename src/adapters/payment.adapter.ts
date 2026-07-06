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

export interface PaymentAdapter {
    charge(input: ChargeInput): Promise<ChargeResult>;
}
