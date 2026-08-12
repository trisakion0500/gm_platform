import dotenv from "dotenv";

dotenv.config();

const required = ["QDRANT_URL", "QDRANT_API_KEY", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 3200),
  // 바인딩할 인터페이스 — 기본값(127.0.0.1)은 "신뢰된 내부망 전용" 설계 전제(§ CLAUDE.md)를 강제한다.
  // 여러 원격 호출자를 허용해야 하는 분리 배포 시나리오에서만 값을 바꾸고, 그 경우 IP 화이트리스트
  // 미들웨어 등 별도 방어를 추가로 검토해야 한다(RAG_API_KEY만으로는 네트워크 노출 자체를 막지 못함).
  host: process.env.HOST || "127.0.0.1",
  // multilingual-e5 계열은 query:/passage: 프리픽스가 필수(reindex.ts/search.service.ts) — 다른 계열로
  // 바꾸면 이 프리픽스 로직도 함께 재검토해야 한다(docs/21_RAG_SERVER.md §3.1).
  embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/multilingual-e5-base",
  qdrant: {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
    collection: process.env.QDRANT_COLLECTION || "gm_docs",
    // RAG Phase 2(API 정의 검색) — docs(gm_docs)와 분리된 별도 alias. store.ts가 두 alias를
    // 공용 로직(alias 스왑·withSocketRetry 등)으로 다루되 완전히 독립된 컬렉션으로 관리한다.
    apisCollection: process.env.QDRANT_APIS_COLLECTION || "gm_apis",
    // Qdrant 클라이언트(REST, fetch 기반)의 클라이언트 측 응답 대기 타임아웃(ms) — 라이브러리 기본값(300000ms=5분)이
    // 그대로면 Qdrant가 완전히 다운(connection refused)된 경우는 즉시 실패하지만, 응답 없이 멈춰있는 상태(hang)일
    // 땐 검색 요청 하나가 최대 5분까지 물릴 수 있었다(server/의 REDIS_COMMAND_TIMEOUT_MS와 동일한 취지의 방어가
    // 빠져 있던 것). 이 클라이언트는 모든 호출(검색·재인덱싱의 대량 upsert 포함)에 동일하게 적용되는 전역값이라
    // (search()처럼 호출별 timeout을 받는 메서드도 있지만 그건 Qdrant 서버 측 쿼리 제한 힌트일 뿐 이 클라이언트
    // 타임아웃과 무관하고, upsert()는 호출별 override 자체가 없음), 너무 짧게 잡으면 정상적인 재인덱싱 대량
    // upsert(현재 코퍼스 기준 실측 32~40초)를 오작동으로 끊어버린다 — reindex.ts의 LOCK_TIMEOUT_MS(60000,
    // "실측 재구축 시간보다 넉넉하게"라는 동일한 여유 기준)와 맞춰 기본값을 60000ms로 둔다.
    timeoutMs: Number(process.env.QDRANT_TIMEOUT_MS ?? 60000),
  },
  // 부팅 시 임베딩 모델 로딩+재인덱싱(warmUp/reindexIfChanged, app.ts의 bootstrap())을 지수 백오프로
  // 재시도할 최대 누적 시간(ms) — MySQL/Qdrant가 이 서버보다 늦게 뜨는 배포 순서에서도 즉시 포기하지
  // 않고 기다린다. 이미 markReady() 이후 런타임 중 Qdrant 장애는 withSocketRetry()·검색 요청 단위
  // 타임아웃으로 이미 별도 처리되므로 이 값과 무관 — 여기서 다루는 건 부팅 시점 최초 준비뿐이다.
  bootRetryMaxMs: Number(process.env.RAG_BOOT_RETRY_MAX_MS ?? 60000),
  // rag_server 호출자(GM Platform server, MCP 클라이언트) 검증용 공유키. 방향이 반대인
  // GET /internal/apis(server/) 호출 시에도 이 값을 그대로 X-API-Key로 실어 보낸다 — server/의
  // ragKeyAuth.ts가 검증하는 env.rag.apiKey(RAG_API_KEY)와 동일한 값이라 공유키 하나로 양방향을 커버한다.
  // 미설정 시(로컬 개발용) apiKeyAuth 미들웨어가 검증을 건너뛴다 — 실사용 전 반드시 설정해야 한다(docs/21_RAG_SERVER.md §3).
  apiKey: process.env.RAG_API_KEY || null,
  // RAG Phase 2(API 정의 검색) — gm_apis 컬렉션이 비어있을 때(부팅 자가치유·build-index-apis) 전체
  // 스냅샷을 pull할 GM Platform server/의 base URL. server/의 GET /internal/apis를 호출한다.
  gmPlatformBaseUrl: process.env.GM_PLATFORM_BASE_URL || "http://127.0.0.1:3000/api",
  // GM Platform 본체(server/)와 동일한 MySQL — rag_server 전용 테이블은 없고, 재인덱싱 인스턴스 간
  // 상호배제용 advisory lock(SP_LOCK_ACQUIRE/SP_LOCK_RELEASE)만 재사용한다(config/db.ts, docs/21_RAG_SERVER.md §3).
  db: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    name: process.env.DB_NAME!,
  },
};
