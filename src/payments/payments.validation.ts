import { z } from "zod";
import { SUPPORTED_PROVIDERS } from "../adapters/registry.js";

export const chargeSchema = z.object({
    provider: z.enum(SUPPORTED_PROVIDERS as [string, ...string[]]),
    token: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().length(3).toUpperCase(),
    customer_email: z.string().email(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
});

export type ChargeBody = z.infer<typeof chargeSchema>;
