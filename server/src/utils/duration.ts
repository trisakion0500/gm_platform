/**
 * "7d"/"24h"/"30m" 형태의 TTL 문자열을 밀리초로 변환한다. 형식이 안 맞으면 기본값 7일을 반환한다.
 * @author trisakion
 * @param ttl 변환할 TTL 문자열 (d=일, h=시간, m=분)
 * @returns 밀리초 단위의 TTL
 */
export function parseDurationMs(ttl: string): number {
  const match = /^(\d+)([dhm])$/.exec(ttl);
  if (!match)
    return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "d")
    return n * 24 * 60 * 60 * 1000;
  if (unit === "h")
    return n * 60 * 60 * 1000;
  return n * 60 * 1000;
}
