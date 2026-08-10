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

// "신뢰된 내부망 전용" 설계 전제(§ CLAUDE.md)를 코드 레벨에서 강제 — env.host 기본값(127.0.0.1)이 없으면
// 모든 인터페이스에 바인딩되어 RAG_API_KEY 하나만으로 외부 네트워크 노출을 막던 상태였다.
app.listen(env.port, env.host, () => {
  logger.info(`rag_server running on ${env.host}:${env.port}`);
});

/**
 * 모델 로딩+재인덱싱을 지수 백오프(1s→2s→4s→...,최대 10s 간격)로 재시도한다. RAG_BOOT_RETRY_MAX_MS
 * 누적 시간 안에 성공 못 하면 포기한다(프로세스는 종료하지 않음 — 기존과 동일하게 재시작 전까지
 * GET /health가 loading으로 남는다). warmUp()은 실패 시 내부적으로 캐시를 리셋해 재호출이 처음부터
 * 다시 시도하고(embedder.ts), reindexIfChanged()는 MySQL advisory lock을 거치므로 MySQL이 아직 안 뜬
 * 상태에서도 이 루프가 자연스럽게 재시도 대상이 된다.
 * @returns 성공 여부
 */
async function bootstrapWithRetry(): Promise<boolean> {
  const startedAt = Date.now();
  let delayMs = 1000;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      await warmUp();
      await reindexIfChanged();
      return true;
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= env.bootRetryMaxMs) {
        logger.error(`부팅 시퀀스 실패 - ${attempt}회 시도, ${elapsed}ms 경과 - 재시작 전까지 서버가 준비되지 않습니다:`, err);
        return false;
      }
      logger.warn(`부팅 시퀀스 실패(${attempt}번째 시도) - ${delayMs}ms 후 재시도:`, err);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 10000);
    }
  }
}

/**
 * 논블로킹 기동 시퀀스 — listen()은 이미 위에서 동기 호출되어 서버 자체는 즉시 응답 가능한 상태다.
 * 이 함수는 그 뒤 백그라운드(await 없이 호출)로 모델 로딩 → 문서 변경 감지 → 필요시 재인덱싱까지 순서대로
 * 진행하고, 전부 끝나야 markReady()로 검색 요청을 열어준다(§3).
 */
async function bootstrap(): Promise<void> {
  const succeeded = await bootstrapWithRetry();
  if (!succeeded)
    return;

  markReady();
  logger.info("rag_server 준비 완료 (isReady=true)");
}

bootstrap();
