import type { Redis } from 'ioredis';
import type { IncrementResponse, Store } from 'express-rate-limit';

/**
 * rate-limit-redis(v6)의 EVALSHA 캐싱 결함을 피하기 위한 자체 구현.
 * rate-limit-redis는 init() 시점에 SCRIPT LOAD로 얻은 SHA를 Promise 필드(incrementScriptSha)에 영구
 * 보관해두고 이후 매 요청마다 그 Promise를 재사용하는데, 그 최초 SCRIPT LOAD 자체가 실패하면(예: 부팅
 * 직후 커넥션 경합으로 인한 타임아웃) 실패한 Promise가 그대로 캐싱되어 프로세스 재기동 전까지 모든 로그인
 * 요청이 즉시 같은 오류로 재실패한다 — 실제로 이 문제가 재현됐다(§ CLAUDE.md). 이 구현은 상태를 전혀
 * 캐싱하지 않고 매 요청마다 독립적인 EVAL 호출만 보내므로, 한 요청의 Redis 실패가 이후 요청에 전혀
 * 영향을 주지 못한다 — 원자성은 EVAL 자체(Redis가 스크립트 전체를 단일 명령으로 실행)로 보장되며,
 * 스크립트 본문은 rate-limit-redis가 쓰던 것과 동일하다(TTL 없으면 SET, 있으면 INCR).
 */
const INCREMENT_SCRIPT = `
local timeToExpire = redis.call("PTTL", KEYS[1])
if timeToExpire <= 0 then
  redis.call("SET", KEYS[1], 1, "PX", ARGV[1])
  return { 1, tonumber(ARGV[1]) }
end
local totalHits = redis.call("INCR", KEYS[1])
return { totalHits, timeToExpire }
`.trim();

export class RedisRateLimitStore implements Store {
  private windowMs = 0;

  /**
   * @param client 연결된 ioredis 클라이언트
   * @param keyPrefix Redis 키 프리픽스(예: "gm:ratelimit:") — 필드명을 prefix로 하지 않는 이유:
   * express-rate-limit의 Store 타입에 이미 공개(public) prefix?: string 필드가 정의돼 있어,
   * private 필드로 같은 이름을 쓰면 구조적 타이핑 충돌(TS2420)이 난다.
   */
  constructor(
    private readonly client: Redis,
    private readonly keyPrefix: string,
  ) {}

  /**
   * express-rate-limit이 미들웨어 생성 시 1회 호출(결과 await 안 함 — express-rate-limit 명세).
   * 동기 대입만 하므로 실패할 여지 자체가 없다(rate-limit-redis처럼 여기서 네트워크 호출을 하지 않음).
   * @param options windowMs를 포함한 rate-limit 설정
   */
  init(options: { windowMs: number }): void {
    this.windowMs = options.windowMs;
  }

  /** @param key 클라이언트 식별자 @returns Redis 키(프리픽스 포함) */
  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * 클라이언트의 히트 카운트를 증가시킨다. 매 호출이 독립적인 EVAL 왕복 — 캐싱된 상태 없음.
   * @param key 클라이언트 식별자
   * @returns 증가된 히트 수와 리셋 시각
   */
  async increment(key: string): Promise<IncrementResponse> {
    const [totalHits, timeToExpire] = (await this.client.eval(
      INCREMENT_SCRIPT,
      1,
      this.prefixKey(key),
      this.windowMs,
    )) as [number, number];
    return { totalHits, resetTime: new Date(Date.now() + timeToExpire) };
  }

  /** @param key 클라이언트 식별자 */
  async decrement(key: string): Promise<void> {
    await this.client.decr(this.prefixKey(key));
  }

  /** @param key 클라이언트 식별자 */
  async resetKey(key: string): Promise<void> {
    await this.client.del(this.prefixKey(key));
  }
}
