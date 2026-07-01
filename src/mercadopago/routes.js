import { Router } from "express";

import { createOrder } from "./controller.js";

const router = Router();

router.post("/payments", createOrder);

export default router;
