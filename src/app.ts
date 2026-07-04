import express from "express";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { randomUUID } from "crypto";
import helmet from "helmet";
import cors from "cors";
import routes from "./routes/index.js";
import { notFoundHandler, errorGenericHandler } from "./middleware/error.js";
import { NODE_ENV, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MINUTES } from "./config.js";
import logger from "./utils/logger.js";
import type { Request } from "express";

const app = express();

app.use(helmet());

if (NODE_ENV !== "test") {
    app.use(
        pinoHttp({
            logger,
            genReqId: (req: Request) => req.headers["x-request-id"] ?? randomUUID(),
            customSuccessMessage: () => "request completed",
            customErrorMessage: () => "request failed",
            serializers: {
                req: (req: Record<string, unknown>) => ({
                    id: req["id"],
                    method: req["method"],
                    url: req["url"],
                }),
                res: (res: Record<string, unknown>) => ({ statusCode: res["statusCode"] }),
            },
        })
    );
}

app.use(cors());

if (NODE_ENV !== "test") {
    app.use(
        rateLimit({
            windowMs: RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
            limit: RATE_LIMIT_MAX,
            standardHeaders: true,
            legacyHeaders: false,
        })
    );
}

app.use(express.json());

app.get("/", (_req, res) => {
    res.json({ status: "running" });
});

app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorGenericHandler);

export default app;
