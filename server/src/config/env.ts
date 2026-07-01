import dotenv from "dotenv";
dotenv.config();

const required = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
  "CORS_ALLOWED_ORIGINS",
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
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m", // 기본 TTL 15분
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d", // 기본 TTL 7일
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS!.split(","),
  },
  log: {
    debugErrors: process.env.LOG_DEBUG_ERRORS === 'true',
  },
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
};
