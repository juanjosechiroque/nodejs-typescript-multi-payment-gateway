import { randomUUID } from "crypto";
import { describe, it, expect, vi } from "vitest";
import request from "supertest";

const { MockStripeCardError, MockStripeInvalidRequestError, stripeMocks } = vi.hoisted(() => {
    class MockStripeCardError extends Error {}

    class MockStripeInvalidRequestError extends Error {
        param?: string;
    }

    const paymentIntentsCreate = vi.fn();

    return {
        MockStripeCardError,
        MockStripeInvalidRequestError,
        stripeMocks: { paymentIntentsCreate },
    };
});

vi.mock("stripe", () => {
    class MockStripe {
        static errors = {
            StripeCardError: MockStripeCardError,
            StripeInvalidRequestError: MockStripeInvalidRequestError,
        };

        customers = {
            list: vi.fn().mockResolvedValue({ data: [{ id: "cus_test" }] }),
            create: vi.fn().mockResolvedValue({ id: "cus_test" }),
        };

        paymentIntents = {
            create: stripeMocks.paymentIntentsCreate.mockImplementation(
                (params: { payment_method: string; amount: number }) => {
                    if (params.payment_method === "pm_card_chargeDeclined") {
                        throw new MockStripeCardError("Your card was declined.");
                    }

                    if (params.payment_method === "pm_card_chargeDeclinedExpiredCard") {
                        throw new MockStripeCardError("Your card has expired.");
                    }

                    return Promise.resolve({
                        id: "pi_test",
                        status: "succeeded",
                        amount: params.amount,
                    });
                }
            ),
        };
    }

    return { default: MockStripe };
});

import app from "../../src/app.js";

interface ChargeResponse {
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

const validBody = {
    provider: "stripe",
    token: "pm_card_visa",
    amount: 10,
    currency: "USD",
    customer_email: "test@example.com",
};

const post = (body: object, idempotencyKey?: string) =>
    request(app)
        .post("/api/payments/charge")
        .set("Idempotency-Key", idempotencyKey ?? randomUUID())
        .send(body);

describe("POST /api/payments/charge", () => {
    describe("when the Idempotency-Key header is missing", () => {
        it("returns 400 with BadRequestError", async () => {
            const res = await request(app).post("/api/payments/charge").send(validBody);
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(400);
            expect(body.code).toBe("BadRequestError");
            expect(body.message).toMatch(/Idempotency-Key/);
        });
    });

    describe("when the Idempotency-Key header is not a valid UUID", () => {
        it("returns 400 with BadRequestError", async () => {
            const res = await post(validBody, "not-a-uuid");
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(400);
            expect(body.code).toBe("BadRequestError");
            expect(body.message).toMatch(/UUID/);
        });
    });

    describe("when the token does not start with pm_", () => {
        it("returns 400 with validation details", async () => {
            const res = await post({ ...validBody, token: "invalid_token" });
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(400);
            expect(body.code).toBe("BadRequestError");
            expect(body.details?.some((d) => d.field === "token")).toBe(true);
        });
    });

    describe("when the amount is below the minimum of 0.50", () => {
        it("returns 400 with validation details", async () => {
            const res = await post({ ...validBody, amount: 0.1 });
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(400);
            expect(body.code).toBe("BadRequestError");
            expect(body.details?.some((d) => d.field === "amount")).toBe(true);
        });
    });

    describe("when the amount has more decimal places than the currency allows", () => {
        it("returns 400 with validation details", async () => {
            const res = await post({ ...validBody, amount: 10.567 });
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

    describe("when the amount is below the minimum for a zero-decimal currency", () => {
        it("returns 400 with validation details", async () => {
            const res = await post({ ...validBody, currency: "JPY", amount: 0.5 });
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(400);
            expect(body.code).toBe("BadRequestError");
            expect(body.details?.some((d) => d.field === "amount")).toBe(true);
        });
    });

    describe("when the currency is not a 3-character code", () => {
        it("returns 400 with validation details", async () => {
            const res = await post({ ...validBody, currency: "DOLLARS" });
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(400);
            expect(body.code).toBe("BadRequestError");
            expect(body.details?.some((d) => d.field === "currency")).toBe(true);
        });
    });

    describe("when the currency requires 3 decimal places", () => {
        it("returns 400 with validation details", async () => {
            const res = await post({ ...validBody, currency: "BHD" });
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

    describe("when the customer_email is not a valid email", () => {
        it("returns 400 with validation details", async () => {
            const res = await post({ ...validBody, customer_email: "not-an-email" });
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(400);
            expect(body.code).toBe("BadRequestError");
            expect(body.details?.some((d) => d.field === "customer_email")).toBe(true);
        });
    });

    describe("when the provider is not supported", () => {
        it("returns 400 with BadRequestError", async () => {
            const res = await post({ ...validBody, provider: "paypal" });
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(400);
            expect(body.code).toBe("BadRequestError");
        });
    });

    describe("when the payment method is a valid Visa card", () => {
        it("returns 201 with succeeded status", async () => {
            const res = await post({ ...validBody, token: "pm_card_visa" });
            const body = res.body as ChargeResponse;

            expect(res.status).toBe(201);
            expect(body.provider).toBe("stripe");
            expect(body.status).toBe("succeeded");
            expect(body.charge_id).toMatch(/^pi_/);
            expect(body.amount).toBe(validBody.amount);
            expect(body.currency).toBe("USD");
        });
    });

    describe("when charging a zero-decimal currency", () => {
        it("returns 201 and sends the amount unchanged to Stripe", async () => {
            const res = await post({ ...validBody, currency: "JPY", amount: 100 });
            const body = res.body as ChargeResponse;

            expect(res.status).toBe(201);
            expect(body.amount).toBe(100);
            expect(body.currency).toBe("JPY");
            expect(stripeMocks.paymentIntentsCreate).toHaveBeenCalledWith(
                expect.objectContaining({ amount: 100 }),
                expect.anything()
            );
        });
    });

    describe("when the card is declined", () => {
        it("returns 502 with GatewayError", async () => {
            const res = await post({ ...validBody, token: "pm_card_chargeDeclined" });
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(502);
            expect(body.code).toBe("GatewayError");
        });
    });

    describe("when the card is expired", () => {
        it("returns 502 with GatewayError", async () => {
            const res = await post({ ...validBody, token: "pm_card_chargeDeclinedExpiredCard" });
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(502);
            expect(body.code).toBe("GatewayError");
        });
    });
});
