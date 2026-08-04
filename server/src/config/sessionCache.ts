import { redisClient, redisKeys } from "./redis";
import { env } from "./env";
import { SessionRow } from "../types";
import * as db from "../db/auth.db";

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

  const [genRaw, cachedRaw] = await Promise.all([
    redisClient.get(genKey),
    redisClient.get(sessionKey),
  ]);
  const generation = genRaw ? Number(genRaw) : 0;

  if (cachedRaw) {
    const cached = JSON.parse(cachedRaw) as CachedSession;
    if (cached.generation === generation)
      return cached.session;
  }

  const session = await db.getSessionByJti(jti);
  if (session) {
    const payload: CachedSession = { session, generation };
    await redisClient.set(sessionKey, JSON.stringify(payload), "EX", env.redis.sessionCacheTtlSeconds);
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
 * @author trisakion
 * @param userId 무효화할 사용자 ID
 * @returns void
 */
export async function invalidateUserSessionCache(userId: number): Promise<void> {
  if (!redisClient)
    return;
  const genKey = redisKeys.sessionGeneration(userId);
  await redisClient.multi().incr(genKey).expire(genKey, env.redis.sessionGenTtlSeconds).exec();
}
