import dotenv from "dotenv";
dotenv.config();

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
  port: Number(process.env.PORT ?? 3000), // 좌측이 null 또는 undefined 일 때만
  db: {
    host: process.env.DB_HOST!, // 이 값은 절대 null/undefined가 아님
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER!, // 이 값은 절대 null/undefined가 아님
    password: process.env.DB_PASSWORD!,
    name: process.env.DB_NAME!, // 이 값은 절대 null/undefined가 아님
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10), // 인스턴스당 풀 크기, 기본 10 (스케일아웃 시 총 커넥션 = 이 값 × 인스턴스 수)
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
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m", // 기본 TTL 15분
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
};
