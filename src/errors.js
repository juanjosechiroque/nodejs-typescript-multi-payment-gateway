function createAppError(message, code, statusCode) {
    const err = new Error(message);
    err.code = code;
    err.statusCode = statusCode;
    return err;
}

export const BadRequestError = (message) => createAppError(message, "BadRequestError", 400);
export const UnprocessableError = (message) => createAppError(message, "UnprocessableError", 422);
export const NotFoundError = (message) => createAppError(message, "NotFoundError", 404);
export const GatewayError = (message) => createAppError(message, "GatewayError", 502);
