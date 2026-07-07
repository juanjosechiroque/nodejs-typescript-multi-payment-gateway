import type { NextFunction, Request, Response } from "express";
import type { Options } from "express-rate-limit";
import { TooManyRequestsError } from "../errors.js";

export function rateLimitExceededHandler(
    _req: Request,
    res: Response,
    _next: NextFunction,
    _optionsUsed: Options
): void {
    const error = TooManyRequestsError();
    res.status(error.statusCode).json({
        status: error.statusCode,
        code: error.code,
        message: error.message,
    });
}
