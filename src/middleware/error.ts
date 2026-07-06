import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import type { AppError } from "../errors.js";
import { NODE_ENV } from "../config.js";

export const notFoundHandler = (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(404).json({
        status: 404,
        code: "NotFoundError",
        message: "Route not found",
    });
};

export const errorGenericHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    const error = err as Partial<AppError> & { status?: number };
    const status = error.statusCode ?? error.status ?? 500;
    const code = error.code ?? "InternalServerError";
    const message =
        status >= 500 && NODE_ENV === "production"
            ? "Internal server error"
            : (error.message ?? "Internal server error");

    const errorWithDetails = error as Partial<AppError> & { details?: unknown };
    const response: Record<string, unknown> = { status, code, message };

    if (errorWithDetails.details !== undefined) {
        response.details = errorWithDetails.details;
    }

    if (NODE_ENV !== "production" && error.stack) {
        response.stack = error.stack;
    }

    res.status(status).json(response);
};
