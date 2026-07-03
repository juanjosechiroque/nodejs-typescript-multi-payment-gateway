export type AppError = Error & {
    code: string;
    statusCode: number;
};

function createAppError(message: string, code: string, statusCode: number): AppError {
    const err = new Error(message) as AppError;
    err.code = code;
    err.statusCode = statusCode;
    return err;
}

export const BadRequestError = (message: string) => createAppError(message, "BadRequestError", 400);

export const UnprocessableError = (message: string) =>
    createAppError(message, "UnprocessableError", 422);

export const NotFoundError = (message: string) => createAppError(message, "NotFoundError", 404);

export const GatewayError = (message: string) => createAppError(message, "GatewayError", 502);
