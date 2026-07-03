import { Router } from "express";
import stripeRoutes from "../stripe/routes.js";

const router = Router();

router.get("/", (_req, res) => {
    res.json({ status: "running" });
});

router.use("/stripe", stripeRoutes);

export default router;
