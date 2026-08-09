import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ERROR_MAP } from '../constants/errors';
import { fail } from '../utils/response';
import { env } from '../config/env';
import { redisClient, redisKeys } from '../config/redis';
import { RedisRateLimitStore } from './redisRateLimitStore';

// 클로저 안에서 redisClient(모듈 top-level const)의 null 좁히기가 유지되지 않아 로컬 변수로 한 번 받아둔다.
const client = redisClient;

/**
 * 로그인/회원가입 브루트포스 방지용 리미터. IP당 windowMs 동안 max회.
 * REDIS_ENABLED=true면 Redis 스토어를 써서 인스턴스 간 카운트를 공유하고,
 * false(기본)면 express-rate-limit 기본 인메모리 스토어로 폴백(단일 인스턴스 한정 유효).
 * Redis 스토어는 rate-limit-redis 대신 자체 구현(RedisRateLimitStore)을 쓴다 — rate-limit-redis는
 * 최초 SCRIPT LOAD 실패를 영구 캐싱해 이후 재시도 없이 계속 같은 오류를 내는 결함이 있어 실제로
 * 재현됐다(§ CLAUDE.md).
 * @author trisakion
 */
export const loginLimiter = rateLimit({
  windowMs: env.loginRateLimit.windowMs,
  max: env.loginRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: client ? new RedisRateLimitStore(client, redisKeys.rateLimit) : undefined,
  handler: (_req: Request, res: Response) => {
    fail(res, ERROR_MAP.TOO_MANY_REQUESTS);
  },
});
