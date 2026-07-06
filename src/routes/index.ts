import { Router } from "express";
import healthRouter from "../api/health/health.router.js";
import stripeRoutes from "../stripe/stripe.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/stripe", stripeRoutes);

export default router;
