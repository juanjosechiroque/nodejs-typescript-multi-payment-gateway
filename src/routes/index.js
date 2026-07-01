import { Router } from "express";

import stripeRoutes from "../stripe/routes.js";
import conektaRoutes from "../conekta/routes.js";
import mercadoPagoRoutes from "../mercadopago/routes.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({ status: "running" });
});

router.use("/stripe", stripeRoutes);
router.use("/conekta", conektaRoutes);
router.use("/mercadopago", mercadoPagoRoutes);

export default router;
