import { NODE_ENV } from "./config.js";

export const error404handler = (req, res, next) => {
    res.status(404).json({ message: "404 not found" });
};

export const errorGenericHandler = (err, req, res, next) => {
    console.log("err", err);
    const errCode = err.code || "general";
    const errStatus = err.status || 500;

    return res.status(errStatus).json({
        status: errStatus,
        code: errCode,
        message: err.message,
        stack: NODE_ENV === "development" ? err : {},
    });
};
