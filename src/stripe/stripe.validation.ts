import { z } from "zod";

export const chargesSchema = z.object({
    payment_method_id: z.string().startsWith("pm_"),
    amount: z.number().positive(),
    currency_code: z.string().length(3).toUpperCase(),
    customer_email: z.string().email(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
});

export type ChargesBody = z.infer<typeof chargesSchema>;
