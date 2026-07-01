import { Router } from "express";
import { createOrder } from "./controller.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema } from "./conekta.validation.js";

const router = Router();

router.post("/order", validate(createOrderSchema), createOrder);

export default router;
