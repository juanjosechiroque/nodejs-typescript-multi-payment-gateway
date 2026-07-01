import { Router } from "express";

import { createOrder } from "./controller.js";

const router = Router();

router.post("/order", createOrder);

export default router;
