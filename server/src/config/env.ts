import dotenv from "dotenv";
import { parseDurationMs } from "../utils/duration";
dotenv.config();

// jwt.accessExpiresIn과 redis.sessionCacheTtlSeconds 기본값 산출 양쪽에서 쓰여 미리 변수로 뺀다.
const jwtAccessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
const jwtAccessExpiresInSeconds = Math.floor(parseDurationMs(jwtAccessExpiresIn) / 1000);

const required = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "LOG_DB_HOST",
  "LOG_DB_PORT",
  "LOG_DB_USER",
  "LOG_DB_PASSWORD",
  "LOG_DB_NAME",
  "JWT_SECRET",
  "CORS_ALLOWED_ORIGINS",
  "ENCRYPTION_KEY",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

// 위 루프에서 required 항목 전체 검증 완료
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  nodeAppInstance: process.env.NODE_APP_INSTANCE, // PM2 fork mode가 인스턴스마다 주입하는 값, 없으면 undefined
  port: Number(process.env.PORT ?? 3000), // 좌측이 null 또는 undefined 일 때만
  db: {
    host: process.env.DB_HOST!, // 이 값은 절대 null/undefined가 아님
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER!, // 이 값은 절대 null/undefined가 아님
    password: process.env.DB_PASSWORD!,
    name: process.env.DB_NAME!, // 이 값은 절대 null/undefined가 아님
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10), // 인스턴스당 풀 크기, 기본 10 (스케일아웃 시 총 커넥션 = 이 값 × 인스턴스 수)
    // 부팅 시 최초 연결 확인을 지수 백오프로 재시도할 최대 누적 시간(ms) — MySQL 컨테이너가 이 서버보다
    // 늦게 뜨는 배포 순서에서도 즉시 종료하지 않고 기다릴 수 있게 한다. 이미 부팅된 이후 런타임 중
    // MySQL 장애는 callSP()가 매 요청 단위로 이미 처리하므로 이 값과 무관하다(app.ts의 connectWithRetry).
    bootRetryMaxMs: Number(process.env.DB_BOOT_RETRY_MAX_MS ?? 60000),
  },
  // log_audit 전용 DB — 메인 DB와 같은 VM/인스턴스라는 보장이 없어 완전히 별도인 pool로 관리 (server/src/config/db.ts의 logPool)
  logDb: {
    host: process.env.LOG_DB_HOST!, // 이 값은 절대 null/undefined가 아님
    port: Number(process.env.LOG_DB_PORT),
    user: process.env.LOG_DB_USER!, // 이 값은 절대 null/undefined가 아님
    password: process.env.LOG_DB_PASSWORD!,
    name: process.env.LOG_DB_NAME!, // 이 값은 절대 null/undefined가 아님
    connectionLimit: Number(process.env.LOG_DB_CONNECTION_LIMIT ?? 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessExpiresIn: jwtAccessExpiresIn, // 기본 TTL 15분
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d", // 기본 TTL 7일
  },
  encryptionKey: process.env.ENCRYPTION_KEY!, // phone_number 등 AES-256-CBC 암호화 키 (32바이트 hex)
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS!.split(","),
  },
  log: {
    debugErrors: process.env.LOG_DEBUG_ERRORS === 'true',
  },
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
  apiExecutionTimeoutMs: Number(process.env.API_EXECUTION_TIMEOUT_MS ?? 10000), // 외부 API(S2S) 호출 타임아웃, 기본 10초
  loginRateLimit: {
    windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? 900000), // 기본 15분
    max: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 10), // 기본 IP당 10회
  },
  sessionCleanupCron: process.env.SESSION_CLEANUP_CRON ?? '0 4 * * *', // 만료 세션 정리 크론 표현식, 기본 매일 새벽 4시
  apiIndexSyncIntervalMs: Number(process.env.API_INDEX_SYNC_INTERVAL_MS ?? 15000), // api_index_sync_queue(아웃박스) 폴링 주기, 기본 15초
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true', // false(기본)면 각 기능이 인메모리/DB로 폴백 — host 값 존재 여부가 아닌 명시적 플래그로 분기
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'gm:', // 이 프로젝트가 쓰는 모든 Redis 키에 공통으로 붙는 프리픽스
    // Redis 명령 타임아웃(ms) — Redis가 응답 불가 상태(장애 등)일 때 ioredis 기본 재시도(최대 20회, 누적 최대 수십초)를
    // 기다리지 않고 이 시간 안에 실패로 확정시켜, Redis 장애가 API 응답 지연으로 그대로 전이되지 않도록 한다.
    // (과거엔 서버 부팅 시점 rate-limit-redis의 최초 SCRIPT LOAD 호출이 ioredis 커넥션 수립과 경합해 타임아웃되면
    // 그 실패가 Promise로 영구 캐싱돼 로그인이 프로세스 재기동 전까지 계속 500이 되는 문제가 실측으로 확인됐었다 —
    // 이 클래스의 결함 자체는 자체 구현 RedisRateLimitStore(middleware/redisRateLimitStore.ts)로 교체해 제거했지만,
    // 이 타임아웃 값 자체는 세션 캐시·참조 데이터 캐시 등 다른 Redis 호출 전반에 여전히 유효한 방어라 그대로 둔다.
    commandTimeoutMs: Number(process.env.REDIS_COMMAND_TIMEOUT_MS ?? 1000),
    // 세션(jti) 캐시 TTL — generation 불일치로 통상 그 즉시 무효화되지만 만약을 대비한 안전판.
    // Access Token 자체가 JWT_ACCESS_EXPIRES_IN이 지나면 세션 캐시를 보기도 전에 거부되므로,
    // 그보다 짧게 잡아봤자 유효한 토큰인데도 불필요하게 DB를 더 자주 타게 만들 뿐이라 기본값을 여기서 맞춘다.
    sessionCacheTtlSeconds: Number(process.env.SESSION_CACHE_TTL_SECONDS ?? jwtAccessExpiresInSeconds),
    // 세션 generation 카운터 TTL — 무효화 시마다 갱신, 반드시 sessionCacheTtlSeconds보다 커야 함(아래 검증). 기본값은 그 2배.
    sessionGenTtlSeconds: Number(process.env.SESSION_GEN_TTL_SECONDS ?? jwtAccessExpiresInSeconds * 2),
  },
  // rag_server(문서 검색) 연동 — mcp_server_dev/pc의 RAG_ENABLED 폴백 패턴과 동일. false(기본)면
  // GET /doc-search 라우트 자체를 등록하지 않는다(routes/index.ts, SWAGGER_ENABLED 조건부 마운트와 동일 방식).
  rag: {
    enabled: process.env.RAG_ENABLED === 'true',
    baseUrl: process.env.RAG_BASE_URL ?? 'http://127.0.0.1:3200',
    apiKey: process.env.RAG_API_KEY, // rag_server의 RAG_API_KEY와 동일 값. 미설정 시 헤더 없이 호출(로컬 개발용)
  },
};

// sessionGenTtlSeconds가 sessionCacheTtlSeconds보다 짧거나 같으면, generation 키가 먼저 만료돼
// "예전 값과 우연히 일치"하는 캐시 항목이 살아남을 수 있어 세션 무효화가 뚫리는 구멍이 생긴다.
if (env.redis.sessionGenTtlSeconds <= env.redis.sessionCacheTtlSeconds) {
  throw new Error(
    `SESSION_GEN_TTL_SECONDS(${env.redis.sessionGenTtlSeconds})는 SESSION_CACHE_TTL_SECONDS(${env.redis.sessionCacheTtlSeconds})보다 커야 합니다`,
  );
}
