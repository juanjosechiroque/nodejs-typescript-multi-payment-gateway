import { z } from "zod";
import { SUPPORTED_CHARGE_PROVIDERS } from "../adapters/registry.js";
import { countDecimals, currencyDecimals, isUnsupportedCurrency } from "../utils/money.js";

const validateAmountAndCurrency = (
    data: { amount: number; currency: string },
    ctx: z.RefinementCtx
) => {
    if (isUnsupportedCurrency(data.currency)) {
        ctx.addIssue({
            code: "custom",
            path: ["currency"],
            message: `Currency ${data.currency} is not supported (requires 3 decimal places, not documented by current providers)`,
        });
        return;
    }

    const min = currencyDecimals(data.currency) === 0 ? 1 : 0.5;
    if (data.amount < min) {
        ctx.addIssue({
            code: "custom",
            path: ["amount"],
            message: `amount must be at least ${min} for currency ${data.currency}`,
        });
    }

    const maxDecimals = currencyDecimals(data.currency);
    if (countDecimals(data.amount) > maxDecimals) {
        ctx.addIssue({
            code: "custom",
            path: ["amount"],
            message: `amount must have at most ${maxDecimals} decimal place(s) for currency ${data.currency}`,
        });
    }
};

export const chargeSchema = z
    .object({
        provider: z.enum(SUPPORTED_CHARGE_PROVIDERS as [string, ...string[]]),
        token: z
            .string()
            .regex(/^pm_/, { message: "token must be a Stripe payment method (pm_...)" }),
        amount: z.number(),
        currency: z.string().length(3).toUpperCase(),
        customer_email: z.string().email(),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
    })
    .superRefine(validateAmountAndCurrency);

export const createOrderSchema = z
    .object({
        provider: z.string().trim().min(1),
        amount: z.number(),
        currency: z.string().length(3).toUpperCase(),
        customer_email: z.string().email(),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
    })
    .superRefine(validateAmountAndCurrency);

export const captureOrderParamsSchema = z.object({
    provider: z.string().trim().min(1),
    providerOrderId: z.string().trim().min(1),
});

export type ChargeBody = z.infer<typeof chargeSchema>;
export type CreateOrderBody = z.infer<typeof createOrderSchema>;
export type CaptureOrderParams = z.infer<typeof captureOrderParamsSchema>;
