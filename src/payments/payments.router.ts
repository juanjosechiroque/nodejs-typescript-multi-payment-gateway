import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { chargeSchema, createOrderSchema } from "./payments.validation.js";
import { captureOrder, createCharge, createOrder } from "./payments.controller.js";

const router = Router();

router.post("/charge", validate(chargeSchema), createCharge);
router.post("/orders", validate(createOrderSchema), createOrder);
router.post("/orders/:provider/:providerOrderId/capture", captureOrder);

export default router;
