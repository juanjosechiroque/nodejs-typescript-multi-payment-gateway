import { z } from "zod";

export const chargesSchema = z.object({
    card_number: z.string().min(13).max(19),
    expiry_month: z.number().int().min(1).max(12),
    expiry_year: z.number().int().min(new Date().getFullYear(), { message: "Card is expired" }),
    cvc: z.string().min(3).max(4),
    amount: z.number().positive(),
    currency_code: z.string().length(3).toUpperCase(),
    customer_email: z.string().email(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
});

export type ChargesBody = z.infer<typeof chargesSchema>;
