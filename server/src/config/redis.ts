import Redis from "ioredis";
import { env } from "./env";
import logger from "../utils/logger";

/**
 * REDIS_ENABLED=true일 때만 연결하는 클라이언트. false(기본)면 null이며,
 * 각 기능(rate limiter 등)은 이 값의 null 여부로 Redis/인메모리(또는 DB) 폴백을 분기한다.
 */
export const redisClient = env.redis.enabled
  ? new Redis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password,
    })
  : null;

redisClient?.on("error", (err) => {
  logger.error(`Redis connection error: ${err instanceof Error ? err.message : String(err)}`);
});

// 이 프로젝트가 쓰는 모든 Redis 키는 REDIS_KEY_PREFIX(기본 "gm:")로 통일한다 — 규칙은 이 파일 한 곳에서만 관리.
export const REDIS_KEY_PREFIX = env.redis.keyPrefix;

export const redisKeys = {
  rateLimit: `${REDIS_KEY_PREFIX}ratelimit:`,
  headerData: (roleCode: number, companyId: number, userId: number) =>
    `${REDIS_KEY_PREFIX}header-data:${roleCode}:${companyId}:${userId}`,
  activeApis: (projectId: number, callerRoleCode: number, callerUserId: number) =>
    `${REDIS_KEY_PREFIX}apis:active:${projectId}:${callerRoleCode}:${callerUserId}`,
  activeCodeGroups: (projectId: number, callerRoleCode: number, callerUserId: number) =>
    `${REDIS_KEY_PREFIX}codegroups:active:${projectId}:${callerRoleCode}:${callerUserId}`,
};
