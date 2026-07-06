import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../errors.js";
import { captureCheckoutOrder, charge, createCheckoutOrder } from "./payments.service.js";
import {
    captureOrderParamsSchema,
    type CaptureOrderParams,
    type ChargeBody,
    type CreateOrderBody,
} from "./payments.validation.js";

function getIdempotencyKey(req: Request): string {
    const raw = req.headers["idempotency-key"];
    const idempotencyKey = Array.isArray(raw) ? raw[0] : raw;
    if (!idempotencyKey) throw BadRequestError("Idempotency-Key header is required");

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(idempotencyKey))
        throw BadRequestError("Idempotency-Key must be a valid UUID");

    return idempotencyKey;
}

export const createCharge = asyncHandler(async (req: Request, res: Response) => {
    const { provider, token, amount, currency, customer_email, description, metadata } =
        req.body as ChargeBody;

    const idempotencyKey = getIdempotencyKey(req);

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

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
    const { provider, amount, currency, customer_email, description, metadata } =
        req.body as CreateOrderBody;

    const idempotencyKey = getIdempotencyKey(req);

    const result = await createCheckoutOrder({
        provider,
        amount,
        currency,
        customer_email,
        idempotencyKey,
        ...(description !== undefined && { description }),
        ...(metadata !== undefined && { metadata }),
    });
    res.status(201).json(result);
});

export const captureOrder = asyncHandler(async (req: Request, res: Response) => {
    const params: CaptureOrderParams = captureOrderParamsSchema.parse(req.params);
    const idempotencyKey = getIdempotencyKey(req);

    const result = await captureCheckoutOrder({
        provider: params.provider,
        providerOrderId: params.providerOrderId,
        idempotencyKey,
    });
    res.status(201).json(result);
});
