// dotenv 로드가 다른 모듈보다 먼저 실행되어야 하므로 반드시 첫 번째로 import
import "./config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { callSP } from "./config/db";
import logger, { exitAfterFlush } from "./utils/logger";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { startSessionCleanupJob } from "./jobs/sessionCleanup.job";
import { startApiIndexSyncJob } from "./jobs/apiIndexSync.job";
import { startLogAuditIndexSyncJob } from "./jobs/logAuditIndexSync.job";
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

/**
 * 부팅 시 MySQL 최초 연결 확인을 지수 백오프(1s→2s→4s→...,최대 10s 간격)로 재시도한다.
 * DB_BOOT_RETRY_MAX_MS 누적 시간 안에 성공 못 하면 최종 실패로 리턴한다(프로세스 종료는 호출부
 * start()가 exitAfterFlush()로 로그 flush까지 기다린 뒤 처리 — 여기서 바로 process.exit()하면
 * 아직 flush되지 않은 마지막 로그가 유실된다). 이미 부팅된 이후 런타임 중 MySQL 장애는 callSP()가
 * 매 요청 단위로 이미 처리하므로(각 쿼리가 pool에서 새 커넥션을 가져오는 구조) 이 재시도와는 별개
 * — 여기서 다루는 건 부팅 시점 최초 연결뿐이다.
 * @returns 연결 성공 여부
 */
async function connectWithRetry(): Promise<boolean> {
  const startedAt = Date.now();
  let delayMs = 1000;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      const [, [timeRows]] = await callSP('SP_GET_CURRENT_TIME', []);
      logger.info(`DB connected - DB time: ${timeRows[0].current_time}`);
      return true;
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= env.db.bootRetryMaxMs) {
        logger.error(`DB connection failed after ${attempt} attempt(s) over ${elapsed}ms, giving up:`, err);
        return false;
      }
      logger.warn(`DB connection failed (attempt ${attempt}), retrying in ${delayMs}ms:`, err);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 10000);
    }
  }
}

async function start() {
  const connected = await connectWithRetry();
  if (!connected)
    return exitAfterFlush(1);

  startSessionCleanupJob();
  // RAG_ENABLED=false면 rag_server 자체가 없는 환경이므로 워커를 등록하지 않는다(routes/index.ts의
  // doc-search/internal 라우트 조건부 등록과 동일 패턴) — 등록해봐야 매 tick 실패만 반복해 로그만 채운다.
  if (env.rag.enabled) {
    startApiIndexSyncJob();
    startLogAuditIndexSyncJob();
  }

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
  });
}

start();

export default app;
