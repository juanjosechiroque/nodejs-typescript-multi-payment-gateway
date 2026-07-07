import { getPayPalConfig } from "../config.js";
import { BadRequestError, GatewayError } from "../errors.js";
import { toPayPalAmount } from "../utils/money.js";

interface PayPalAmount {
    value: string;
    currency_code: string;
}

interface PayPalLink {
    href: string;
    rel: string;
}

export interface PayPalOrderResponse {
    id: string;
    status: string;
    links?: PayPalLink[];
    purchase_units?: {
        payments?: {
            captures?: {
                id: string;
                status: string;
                amount?: PayPalAmount;
            }[];
        };
    }[];
}

interface PayPalTokenResponse {
    access_token: string;
}

export interface PayPalCreateOrderInput {
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, string>;
    idempotencyKey: string;
}

export class PayPalClient {
    private accessToken?: string;

    async createOrder(input: PayPalCreateOrderInput): Promise<PayPalOrderResponse> {
        return this.request<PayPalOrderResponse>("/v2/checkout/orders", {
            method: "POST",
            idempotencyKey: input.idempotencyKey,
            body: {
                intent: "CAPTURE",
                purchase_units: [
                    {
                        amount: {
                            currency_code: input.currency.toUpperCase(),
                            value: toPayPalAmount(input.amount, input.currency),
                        },
                        ...(input.description !== undefined && { description: input.description }),
                        ...(input.metadata !== undefined && {
                            custom_id: JSON.stringify(input.metadata),
                        }),
                    },
                ],
            },
        });
    }

    async captureOrder(orderId: string, idempotencyKey: string): Promise<PayPalOrderResponse> {
        return this.request<PayPalOrderResponse>(`/v2/checkout/orders/${orderId}/capture`, {
            method: "POST",
            idempotencyKey,
        });
    }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken) return this.accessToken;

        const { baseUrl, clientId, clientSecret } = getPayPalConfig();
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        });

        if (!response.ok) {
            throw GatewayError("PayPal authentication failed");
        }

        const payload = (await response.json()) as Partial<PayPalTokenResponse>;
        if (!payload.access_token) {
            throw GatewayError("PayPal authentication returned an invalid response");
        }

        this.accessToken = payload.access_token;
        return payload.access_token;
    }

    private async request<T>(
        path: string,
        options: { method: "POST"; idempotencyKey: string; body?: unknown }
    ): Promise<T> {
        const { baseUrl } = getPayPalConfig();
        const accessToken = await this.getAccessToken();

        const response = await fetch(`${baseUrl}${path}`, {
            method: options.method,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "PayPal-Request-Id": options.idempotencyKey,
            },
            ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
        });

        if (!response.ok) {
            const message = await readPayPalErrorMessage(response);
            if (response.status >= 400 && response.status < 500) throw BadRequestError(message);
            throw GatewayError(message);
        }

        return (await response.json()) as T;
    }
}

async function readPayPalErrorMessage(response: Response): Promise<string> {
    try {
        const payload = (await response.json()) as { message?: string; name?: string };
        return payload.message ?? payload.name ?? "PayPal returned an error";
    } catch {
        return "PayPal returned an error";
    }
}
