import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

interface HealthResponse {
    status: string;
    uptime: number;
    timestamp: string;
}

describe("GET /api/health", () => {
    it("returns 200 with healthy status", async () => {
        const res = await request(app).get("/api/health");
        const body = res.body as HealthResponse;

        expect(res.status).toBe(200);
        expect(body.status).toBe("healthy");
        expect(typeof body.uptime).toBe("number");
        expect(body.uptime).toBeGreaterThan(0);
        expect(body.timestamp).toBeDefined();
    });
});
