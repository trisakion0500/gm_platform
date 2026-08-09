import { redisClient, redisKeys } from "./redis";
import { env } from "./env";
import { SessionRow } from "../types";
import * as db from "../db/auth.db";
import logger from "../utils/logger";

interface CachedSession {
  session: SessionRow;
  generation: number;
}

/**
 * jti로 세션을 조회한다. REDIS_ENABLED=true면 user 단위 generation 카운터를 곁들인 캐시를 거치고,
 * false면 매번 DB(SP_GET_SESSION_BY_JTI)를 직접 조회한다(기존 동작 그대로).
 * generation은 로그아웃/비밀번호 변경/계정 상태 변경 시 invalidateUserSessionCache로 올라가며,
 * 캐시된 값의 generation이 현재 값과 다르면 캐시 미스로 취급해 DB를 재조회하고 새 generation으로 재캐싱한다 —
 * 개별 jti를 일일이 지우지 않아도 그 사용자의 캐시된 세션 전체가 다음 조회에서 자동으로 무효화된다.
 * REDIS_ENABLED=true인데 Redis가 런타임에 오류를 내면(타임아웃 등) DB로 폴백해 조회 자체는 계속 성공하고,
 * 캐시 저장 실패도 별도로 흡수해 요청을 막지 않는다 — Redis 장애가 인증 전체 장애로 번지지 않게 하는 목적.
 * @author trisakion
 * @param jti 조회할 Access Token JTI
 * @param userId JWT 페이로드의 user_id (generation 키 조회에 그대로 사용, DB 왕복 불필요)
 * @returns 세션 정보, 존재하지 않으면 null
 */
export async function getCachedSession(jti: string, userId: number): Promise<SessionRow | null> {
  if (!redisClient)
    return db.getSessionByJti(jti);

  const genKey = redisKeys.sessionGeneration(userId);
  const sessionKey = redisKeys.sessionEntry(jti);

  let generation = 0;
  let cachedRaw: string | null = null;
  try {
    const [genRaw, raw] = await Promise.all([
      redisClient.get(genKey),
      redisClient.get(sessionKey),
    ]);
    generation = genRaw ? Number(genRaw) : 0;
    cachedRaw = raw;
  } catch (err) {
    logger.warn(`Redis 세션 캐시 조회 실패 — DB로 폴백: ${err instanceof Error ? err.message : String(err)}`);
    return db.getSessionByJti(jti);
  }

  if (cachedRaw) {
    const cached = JSON.parse(cachedRaw) as CachedSession;
    if (cached.generation === generation)
      return cached.session;
  }

  const session = await db.getSessionByJti(jti);
  if (session) {
    const payload: CachedSession = { session, generation };
    try {
      await redisClient.set(sessionKey, JSON.stringify(payload), "EX", env.redis.sessionCacheTtlSeconds);
    } catch (err) {
      logger.warn(`Redis 세션 캐시 저장 실패 — 캐싱 없이 계속 진행: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return session;
}

/**
 * 사용자의 캐시된 세션을 전부 무효화한다 — 로그아웃/비밀번호 변경/계정 상태 변경(사용중지 등) 시 호출.
 * 개별 jti 키를 찾아 지우는 대신 generation 카운터를 올려, 다음 조회부터 자동으로 캐시 미스가 되게 한다.
 * generation 키에도 TTL(sessionGenTtlSeconds, jti 캐시 TTL보다 항상 김)을 걸어 무효화가 뜸한 사용자의
 * 카운터가 Redis에 영구히 남지 않도록 한다 — jti 캐시가 먼저 만료되므로 generation 만료로 인한
 * "예전 값과 우연히 일치" 위험은 없다(env.ts의 sessionGenTtlSeconds > sessionCacheTtlSeconds 검증 참고).
 * REDIS_ENABLED=false면 애초에 캐시가 없으므로 아무 것도 하지 않는다.
 * Redis가 런타임 오류를 내도 예외를 던지지 않는다 — 무효화 실패로 로그아웃/비밀번호 변경 자체가
 * 막히면 캐시 하나 때문에 더 중요한 동작이 깨지는 셈이라, 경고 로그만 남기고 호출자는 정상 진행시킨다.
 * @author trisakion
 * @param userId 무효화할 사용자 ID
 * @returns void
 */
export async function invalidateUserSessionCache(userId: number): Promise<void> {
  if (!redisClient)
    return;
  const genKey = redisKeys.sessionGeneration(userId);
  try {
    await redisClient.multi().incr(genKey).expire(genKey, env.redis.sessionGenTtlSeconds).exec();
  } catch (err) {
    logger.warn(`Redis 세션 캐시 무효화 실패(generation 미증가) — 로그아웃/비밀번호 변경 자체는 계속 진행: ${err instanceof Error ? err.message : String(err)}`);
  }
}
