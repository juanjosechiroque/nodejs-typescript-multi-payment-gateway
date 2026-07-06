import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { chargeSchema } from "./payments.validation.js";
import { createCharge } from "./payments.controller.js";

const router = Router();

router.post("/charge", validate(chargeSchema), createCharge);

export default router;
