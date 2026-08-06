import express from "express";
import { env } from "./config/env";
import router from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { warmUp } from "./embedding/embedder";
import { reindexIfChanged } from "./index/reindex";
import { markReady } from "./readiness";
import logger from "./utils/logger";

const app = express();

app.use(express.json());
app.use(requestLogger);
app.use("/", router);
app.use(errorHandler);

if (!env.apiKey) {
  logger.warn("RAG_API_KEY 미설정 - X-API-Key 검증을 건너뜁니다. MCP 경로의 유일한 방어선이므로 실사용 전 반드시 설정하세요.");
}

app.listen(env.port, () => {
  logger.info(`rag_server running on port ${env.port}`);
});

/**
 * 논블로킹 기동 시퀀스 — listen()은 이미 위에서 동기 호출되어 서버 자체는 즉시 응답 가능한 상태다.
 * 이 함수는 그 뒤 백그라운드(await 없이 호출)로 모델 로딩 → 문서 변경 감지 → 필요시 재인덱싱까지 순서대로
 * 진행하고, 전부 끝나야 markReady()로 검색 요청을 열어준다(§3). 실패 시 markReady()를 호출하지 않아
 * GET /health가 loading 상태로 남고 POST /search는 503을 유지한다.
 */
async function bootstrap(): Promise<void> {
  try {
    await warmUp();
  } catch (err) {
    logger.error("임베딩 모델 로딩 실패 — 재시작 전까지 서버가 준비되지 않습니다.", err);
    return;
  }

  try {
    await reindexIfChanged();
  } catch (err) {
    logger.error("부팅 시 재인덱싱 실패(락 획득 실패 포함) — 재시작 전까지 서버가 준비되지 않습니다.", err);
    return;
  }

  markReady();
  logger.info("rag_server 준비 완료 (isReady=true)");
}

bootstrap();
