import { redisClient } from "./redis";

// 헤더/사이드바 콤보박스 등 참조 데이터 캐시의 공통 TTL — 다소의 stale은 허용되는 데이터라
// 짧은 TTL로 DB 라운드트립만 줄이면 충분하다(정확한 실시간 반영이 필요한 데이터에는 이 캐시를 쓰지 않는다).
export const REFERENCE_DATA_CACHE_TTL_SECONDS = 60;

const memoryStore = new Map<string, { value: unknown; expiresAt: number }>();

/**
 * key로 캐시를 조회하고 없으면 fetchFn을 실행해 ttlSeconds 동안 캐시한 뒤 반환한다.
 * REDIS_ENABLED=true면 Redis를, 아니면 프로세스 내 메모리(Map)를 사용한다 — 둘 다 "캐시"라는
 * 동일한 역할이라 인스턴스 간 공유 여부만 다를 뿐 호출부 로직은 동일하게 유지된다.
 * @author trisakion
 * @param key 캐시 키 (redisKeys의 빌더로 생성, "gm:" 프리픽스 포함)
 * @param ttlSeconds 캐시 유지 시간(초)
 * @param fetchFn 캐시 미스 시 실행할 원본 조회 함수
 * @returns 캐시되거나 새로 조회된 값
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  if (redisClient) {
    const cached = await redisClient.get(key);
    if (cached !== null)
      return JSON.parse(cached) as T;

    const value = await fetchFn();
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return value;
  }

  const hit = memoryStore.get(key);
  if (hit && hit.expiresAt > Date.now())
    return hit.value as T;

  const value = await fetchFn();
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return value;
}
