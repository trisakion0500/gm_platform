import dotenv from "dotenv";

dotenv.config();

const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 3100),
  db: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    name: process.env.DB_NAME!,
  },
  // GM Platform이 발급한 X-API-Key. 미설정 시 apiKeyAuth 미들웨어가 검증을 건너뛴다(하위호환, 로컬 개발용).
  apiKey: process.env.API_KEY || null,
};
