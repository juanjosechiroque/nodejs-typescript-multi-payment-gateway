import { Router } from "express";
import { charges } from "./stripe.controller.js";
import { validate } from "../middleware/validate.js";
import { chargesSchema } from "./stripe.validation.js";

const router = Router();

router.post("/charges", validate(chargesSchema), charges);

export default router;
