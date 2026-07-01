import { Router } from "express";
import { createOrder } from "./controller.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema } from "./mercadopago.validation.js";

const router = Router();

router.post("/payments", validate(createOrderSchema), createOrder);

export default router;
