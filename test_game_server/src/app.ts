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

if (!env.apiKey) {
  logger.warn("API_KEY 미설정 - X-API-Key 검증을 건너뜁니다. 운영 환경에서는 반드시 설정하세요.");
}

app.listen(env.port, () => {
  logger.info(`test_game_server running on port ${env.port}`);
});
