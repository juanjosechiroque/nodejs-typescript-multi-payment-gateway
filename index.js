import { PORT, NODE_ENV } from "./src/config.js";
import app from "./src/app.js";

app.listen(PORT);

console.log("Server running on port", PORT);
console.log("Environment", NODE_ENV);
