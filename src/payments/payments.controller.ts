import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { charge } from "./payments.service.js";
import type { ChargeBody } from "./payments.validation.js";

export const createCharge = asyncHandler(async (req: Request, res: Response) => {
    const { provider, token, amount, currency, customer_email, description, metadata } =
        req.body as ChargeBody;

    const result = await charge({
        provider,
        token,
        amount,
        currency,
        customer_email,
        ...(description !== undefined && { description }),
        ...(metadata !== undefined && { metadata }),
    });
    res.status(201).json(result);
});
