import { randomUUID } from "crypto";
import { describe, it, expect } from "vitest";
import request from "supertest";
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
    amount: 100,
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

    describe("when the currency is not a 3-character code", () => {
        it("returns 400 with validation details", async () => {
            const res = await post({ ...validBody, currency: "DOLLARS" });
            const body = res.body as ErrorResponse;

            expect(res.status).toBe(400);
            expect(body.code).toBe("BadRequestError");
            expect(body.details?.some((d) => d.field === "currency")).toBe(true);
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
