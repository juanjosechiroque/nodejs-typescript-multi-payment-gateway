import { Router } from "express";
import { charges } from "./stripe.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { chargesSchema } from "./stripe.validation.js";

const router = Router();

router.post("/charges", validate(chargesSchema), asyncHandler(charges));

export default router;
