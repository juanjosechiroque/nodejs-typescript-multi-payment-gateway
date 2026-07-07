import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const paypalMocks = vi.hoisted(() => ({
    createOrder: vi.fn(),
    captureOrder: vi.fn(),
}));

vi.mock("../../src/adapters/paypal.client.js", () => ({
    PayPalClient: class {
        createOrder = paypalMocks.createOrder;
        captureOrder = paypalMocks.captureOrder;
    },
}));

import app from "../../src/app.js";

interface CreateOrderResponse {
    provider: string;
    provider_order_id: string;
    status: string;
    amount: number;
    currency: string;
    approval_url?: string;
}

interface CaptureOrderResponse {
    provider: string;
    charge_id: string;
    status: string;
    amount: number;
    currency: string;
}

interface ErrorResponse {
    status: number;
    code: string;
    message: string;
    details?: { field: string; message: string }[];
}

const validOrderBody = {
    provider: "paypal",
    amount: 10,
    currency: "USD",
    customer_email: "buyer@example.com",
    description: "Order #1234",
};

const postOrder = (body: object, idempotencyKey = randomUUID()) =>
    request(app).post("/api/payments/orders").set("Idempotency-Key", idempotencyKey).send(body);

const captureOrder = (providerOrderId = "PAYPAL_ORDER_123", idempotencyKey = randomUUID()) =>
    request(app)
        .post(`/api/payments/orders/paypal/${providerOrderId}/capture`)
        .set("Idempotency-Key", idempotencyKey);

describe("PayPal checkout order flow", () => {
    beforeEach(() => {
        paypalMocks.createOrder.mockReset();
        paypalMocks.captureOrder.mockReset();

        paypalMocks.createOrder.mockResolvedValue({
            id: "PAYPAL_ORDER_123",
            status: "CREATED",
            links: [{ rel: "approve", href: "https://www.paypal.com/checkoutnow?token=123" }],
        });

        paypalMocks.captureOrder.mockResolvedValue({
            id: "PAYPAL_ORDER_123",
            status: "COMPLETED",
            purchase_units: [
                {
                    payments: {
                        captures: [
                            {
                                id: "PAYPAL_CAPTURE_123",
                                status: "COMPLETED",
                                amount: { value: "10.00", currency_code: "USD" },
                            },
                        ],
                    },
                },
            ],
        });
    });

    describe("Given a valid PayPal order request", () => {
        describe("When the client creates a checkout order", () => {
            it("Then returns a pending order with an approval URL", async () => {
                const idempotencyKey = randomUUID();
                const res = await postOrder(validOrderBody, idempotencyKey);
                const body = res.body as CreateOrderResponse;

                expect(res.status).toBe(201);
                expect(body.provider).toBe("paypal");
                expect(body.provider_order_id).toBe("PAYPAL_ORDER_123");
                expect(body.status).toBe("pending");
                expect(body.amount).toBe(validOrderBody.amount);
                expect(body.currency).toBe("USD");
                expect(body.approval_url).toContain("paypal.com");
                expect(paypalMocks.createOrder).toHaveBeenCalledWith(
                    expect.objectContaining({ idempotencyKey })
                );
            });
        });
    });

    describe("Given a PayPal order request without Idempotency-Key", () => {
        describe("When the client creates a checkout order", () => {
            it("Then returns 400 with BadRequestError", async () => {
                const res = await request(app).post("/api/payments/orders").send(validOrderBody);
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(body.message).toMatch(/Idempotency-Key/);
            });
        });
    });

    describe("Given a PayPal order request with invalid payment data", () => {
        describe("When the amount is below the minimum of 0.50", () => {
            it("Then returns 400 with validation details", async () => {
                const res = await postOrder({ ...validOrderBody, amount: 0.1 });
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(body.details?.some((d) => d.field === "amount")).toBe(true);
            });
        });

        describe("When the amount has more decimal places than the currency allows", () => {
            it("Then returns 400 with validation details", async () => {
                const res = await postOrder({ ...validOrderBody, amount: 10.567 });
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(
                    body.details?.some(
                        (d) => d.field === "amount" && d.message.includes("decimal place")
                    )
                ).toBe(true);
            });
        });

        describe("When the amount is below the minimum for a zero-decimal currency", () => {
            it("Then returns 400 with validation details", async () => {
                const res = await postOrder({ ...validOrderBody, currency: "JPY", amount: 0.5 });
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(body.details?.some((d) => d.field === "amount")).toBe(true);
            });
        });

        describe("When the currency is not a 3-character code", () => {
            it("Then returns 400 with validation details", async () => {
                const res = await postOrder({ ...validOrderBody, currency: "DOLLARS" });
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(body.details?.some((d) => d.field === "currency")).toBe(true);
            });
        });

        describe("When the currency requires 3 decimal places", () => {
            it("Then returns 400 with validation details", async () => {
                const res = await postOrder({ ...validOrderBody, currency: "BHD" });
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(
                    body.details?.some(
                        (d) => d.field === "currency" && d.message.includes("not supported")
                    )
                ).toBe(true);
            });
        });

        describe("When the customer_email is not a valid email", () => {
            it("Then returns 400 with validation details", async () => {
                const res = await postOrder({ ...validOrderBody, customer_email: "not-an-email" });
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(body.details?.some((d) => d.field === "customer_email")).toBe(true);
            });
        });
    });

    describe("Given an unsupported checkout order provider", () => {
        describe("When the client creates a checkout order", () => {
            it("Then returns 400 with BadRequestError", async () => {
                const res = await postOrder({ ...validOrderBody, provider: "stripe" });
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(body.message).toMatch(/Unsupported checkout order provider/);
            });
        });
    });

    describe("Given an unsupported checkout capture provider", () => {
        describe("When the client captures the order", () => {
            it("Then returns 400 with BadRequestError", async () => {
                const res = await request(app)
                    .post("/api/payments/orders/stripe/ORDER_123/capture")
                    .set("Idempotency-Key", randomUUID());
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(body.message).toMatch(/Unsupported checkout order provider/);
            });
        });
    });

    describe("Given an approved PayPal order", () => {
        describe("When the client captures the order", () => {
            it("Then returns a succeeded charge result", async () => {
                const idempotencyKey = randomUUID();
                const res = await captureOrder("PAYPAL_ORDER_123", idempotencyKey);
                const body = res.body as CaptureOrderResponse;

                expect(res.status).toBe(201);
                expect(body.provider).toBe("paypal");
                expect(body.charge_id).toBe("PAYPAL_CAPTURE_123");
                expect(body.status).toBe("succeeded");
                expect(body.amount).toBe(10);
                expect(body.currency).toBe("USD");
                expect(paypalMocks.captureOrder).toHaveBeenCalledWith(
                    "PAYPAL_ORDER_123",
                    idempotencyKey
                );
            });
        });
    });

    describe("Given a PayPal order that remains pending after capture", () => {
        describe("When the client captures the order", () => {
            it("Then returns a pending charge result", async () => {
                paypalMocks.captureOrder.mockResolvedValueOnce({
                    id: "PAYPAL_ORDER_PENDING",
                    status: "PENDING",
                });

                const res = await captureOrder("PAYPAL_ORDER_PENDING");
                const body = res.body as CaptureOrderResponse;

                expect(res.status).toBe(201);
                expect(body.provider).toBe("paypal");
                expect(body.charge_id).toBe("PAYPAL_ORDER_PENDING");
                expect(body.status).toBe("pending");
            });
        });
    });

    describe("Given a PayPal order that is declined during capture", () => {
        describe("When the client captures the order", () => {
            it("Then returns 502 with GatewayError", async () => {
                paypalMocks.captureOrder.mockResolvedValueOnce({
                    id: "PAYPAL_ORDER_DECLINED",
                    status: "DECLINED",
                });

                const res = await captureOrder("PAYPAL_ORDER_DECLINED");
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(502);
                expect(body.code).toBe("GatewayError");
                expect(body.message).toMatch(/DECLINED/);
            });
        });
    });

    describe("Given a PayPal capture request without Idempotency-Key", () => {
        describe("When the client captures the order", () => {
            it("Then returns 400 with BadRequestError", async () => {
                const res = await request(app).post(
                    "/api/payments/orders/paypal/PAYPAL_ORDER_123/capture"
                );
                const body = res.body as ErrorResponse;

                expect(res.status).toBe(400);
                expect(body.code).toBe("BadRequestError");
                expect(body.message).toMatch(/Idempotency-Key/);
            });
        });
    });
});
