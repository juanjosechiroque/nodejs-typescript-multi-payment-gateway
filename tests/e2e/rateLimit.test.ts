import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

describe("payment creation rate limiting", () => {
    const originalForceRateLimit = process.env.FORCE_RATE_LIMIT_IN_TEST;
    const originalStripeKey = process.env.STRIPE_PRIVATE_KEY;
    let app: Express;

    beforeAll(async () => {
        process.env.FORCE_RATE_LIMIT_IN_TEST = "true";
        process.env.STRIPE_PRIVATE_KEY = process.env.STRIPE_PRIVATE_KEY ?? "sk_test_rate_limit";
        vi.resetModules();
        app = (await import("../../src/app.js")).default;
    });

    afterAll(() => {
        if (originalForceRateLimit === undefined) {
            delete process.env.FORCE_RATE_LIMIT_IN_TEST;
        } else {
            process.env.FORCE_RATE_LIMIT_IN_TEST = originalForceRateLimit;
        }

        if (originalStripeKey === undefined) {
            delete process.env.STRIPE_PRIVATE_KEY;
        } else {
            process.env.STRIPE_PRIVATE_KEY = originalStripeKey;
        }

        vi.resetModules();
    });

    it("returns 429 after exceeding 10 requests per minute on POST /api/payments/charge", async () => {
        const responses = [];

        for (let i = 0; i < 11; i++) {
            responses.push(await request(app).post("/api/payments/charge").send({}));
        }

        const rateLimited = responses.find((res) => res.status === 429);
        expect(rateLimited).toBeDefined();
        expect(rateLimited!.body).toEqual({
            status: 429,
            code: "TooManyRequestsError",
            message: "Rate limit exceeded",
        });
    });
});
