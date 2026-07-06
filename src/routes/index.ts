import { Router } from "express";
import healthRouter from "../api/health/health.router.js";
import paymentsRouter from "../payments/payments.router.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/payments", paymentsRouter);

export default router;
