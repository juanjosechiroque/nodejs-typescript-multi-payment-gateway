import { z } from "zod";
import { SUPPORTED_CHARGE_PROVIDERS } from "../adapters/registry.js";

export const chargeSchema = z.object({
    provider: z.enum(SUPPORTED_CHARGE_PROVIDERS as [string, ...string[]]),
    token: z.string().regex(/^pm_/, { message: "token must be a Stripe payment method (pm_...)" }),
    amount: z.number().min(0.5, { message: "amount must be at least 0.50" }),
    currency: z.string().length(3).toUpperCase(),
    customer_email: z.string().email(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
});

export const createOrderSchema = z.object({
    provider: z.string().trim().min(1),
    amount: z.number().min(0.5, { message: "amount must be at least 0.50" }),
    currency: z.string().length(3).toUpperCase(),
    customer_email: z.string().email(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
});

export const captureOrderParamsSchema = z.object({
    provider: z.string().trim().min(1),
    providerOrderId: z.string().trim().min(1),
});

export type ChargeBody = z.infer<typeof chargeSchema>;
export type CreateOrderBody = z.infer<typeof createOrderSchema>;
export type CaptureOrderParams = z.infer<typeof captureOrderParamsSchema>;
