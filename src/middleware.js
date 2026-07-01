import { NODE_ENV } from "./config.js";

export const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        status: 404,
        code: "NotFoundError",
        message: "Route not found",
    });
};

export const errorGenericHandler = (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const code = err.code || "InternalServerError";
    const message =
        status >= 500 && NODE_ENV === "production" ? "Internal server error" : err.message;

    const response = { status, code, message };

    if (NODE_ENV !== "production" && err.stack) {
        response.stack = err.stack;
    }

    res.status(status).json(response);
};
