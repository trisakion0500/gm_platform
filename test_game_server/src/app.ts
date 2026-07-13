import express from "express";
import { env } from "./config/env";
import router from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import logger from "./utils/logger";

const app = express();

app.use(express.json());
app.use(requestLogger);
app.use("/api", router);
app.use(errorHandler);

app.listen(env.port, () => {
  logger.info(`test_game_server running on port ${env.port}`);
});
