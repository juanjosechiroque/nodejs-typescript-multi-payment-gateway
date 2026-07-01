import express from "express";
import helmet from "helmet";
import cors from "cors";
import routes from "./routes/index.js";
import { notFoundHandler, errorGenericHandler } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorGenericHandler);

export default app;
