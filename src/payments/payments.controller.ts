import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../errors.js";
import { charge } from "./payments.service.js";
import type { ChargeBody } from "./payments.validation.js";

export const createCharge = asyncHandler(async (req: Request, res: Response) => {
    const { provider, token, amount, currency, customer_email, description, metadata } =
        req.body as ChargeBody;

    const raw = req.headers["idempotency-key"];
    const idempotencyKey = Array.isArray(raw) ? raw[0] : raw;
    if (!idempotencyKey) throw BadRequestError("Idempotency-Key header is required");

    const result = await charge({
        provider,
        token,
        amount,
        currency,
        customer_email,
        idempotencyKey,
        ...(description !== undefined && { description }),
        ...(metadata !== undefined && { metadata }),
    });
    res.status(201).json(result);
});
