// dotenv 로드가 다른 모듈보다 먼저 실행되어야 하므로 반드시 첫 번째로 import
import "./config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { callSP } from "./config/db";
import logger from "./utils/logger";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import router from "./routes";

const app = express();

// nginx 등 앞단 프록시가 항상 있다고 가정할 수 없어 앱 레벨에서도 최소 보안 헤더를 둔다.
// SWAGGER_ENABLED=true면 Swagger UI(HTML, 인라인 스크립트/스타일 사용)가 함께 뜨므로 CSP만 끈다 — 나머지 헤더는 유지.
app.use(helmet({ contentSecurityPolicy: env.swaggerEnabled ? false : undefined }));
app.use(cors({ origin: env.cors.allowedOrigins }));
app.use(express.json());
app.use(requestLogger);
if (env.swaggerEnabled) {
  // SWAGGER_ENABLED=true 일 때만 모듈 로드 → false 시 메모리에 올라오지 않음
  const swaggerUi = require("swagger-ui-express");
  const { swaggerSpec } = require("./config/swagger");
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
app.use("/api", router);
app.use(errorHandler); // 라우터 등록 이후 마지막에 위치해야 모든 에러를 포착

async function start() {
  try {
    const [, [timeRows]] = await callSP('SP_GET_CURRENT_TIME', []);
    logger.info(`DB connected - DB time: ${timeRows[0].current_time}`);
  } catch (err) {
    logger.error('DB connection failed:', err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
  });
}

start();

export default app;
