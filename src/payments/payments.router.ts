import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { validate } from "../middleware/validate.js";
import { rateLimitExceededHandler } from "../middleware/rateLimit.js";
import { RATE_LIMIT_ENABLED } from "../config.js";
import { chargeSchema, createOrderSchema } from "./payments.validation.js";
import { captureOrder, createCharge, createOrder } from "./payments.controller.js";

const router = Router();

// Stricter than the global limiter (10/min) to mitigate card testing on payment creation endpoints.
const paymentCreationLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitExceededHandler,
});

const paymentLimit = RATE_LIMIT_ENABLED
    ? paymentCreationLimiter
    : (_req: Request, _res: Response, next: NextFunction) => {
          next();
      };

router.post("/charge", paymentLimit, validate(chargeSchema), createCharge);
router.post("/orders", paymentLimit, validate(createOrderSchema), createOrder);
router.post("/orders/:provider/:providerOrderId/capture", captureOrder);

export default router;
