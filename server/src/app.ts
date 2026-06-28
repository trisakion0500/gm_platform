// dotenv 로드가 다른 모듈보다 먼저 실행되어야 하므로 반드시 첫 번째로 import
import "./config/env";
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { callSP } from "./config/db";
import logger from "./utils/logger";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import router from "./routes";

const app = express();

app.use(cors({ origin: env.cors.allowedOrigins }));
app.use(express.json());
app.use(requestLogger);
app.use("/api", router);
app.use(errorHandler); // 라우터 등록 이후 마지막에 위치해야 모든 에러를 포착

async function start() {
  try {
    const [, [timeRows]] = await callSP('SP_GET_CURRENT_TIME', []);
    logger.info(`DB 연결 성공 - DB 시간: ${timeRows[0].current_time}`);
  } catch (err) {
    logger.error('DB 연결 실패:', err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
  });
}

start();

export default app;
