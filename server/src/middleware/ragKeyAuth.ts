import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import { fail } from '../utils/response';
import { ERROR_MAP } from '../constants/errors';

/**
 * rag_server가 GET /internal/apis(전체 활성 API 스냅샷 pull)를 호출할 때 쓰는 X-API-Key 검증
 * 미들웨어. rag_server의 middleware/apiKeyAuth.ts와 정확히 동일한 패턴(상수 시간 비교, 헤더
 * 누락·불일치 모두 동일한 401로 응답해 원인 비노출)이지만 검증 방향이 반대다 — 여기서는
 * server/가 검증자, rag_server가 호출자다. 두 서비스가 같은 RAG_API_KEY 값을 공유해 인증한다
 * (env.rag.apiKey, docs/21_RAG_SERVER.md §10.2).
 * env.rag.apiKey가 설정되지 않은 경우(로컬 개발용) 검증을 건너뛴다.
 * @author trisakion
 * @param req Express Request 객체
 * @param res Express Response 객체
 * @param next 다음 미들웨어 함수
 * @returns void
 */
export function ragKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!env.rag.apiKey) {
    next();
    return;
  }

  const header = req.header('X-API-Key');
  if (!header) {
    fail(res, ERROR_MAP.UNAUTHORIZED);
    return;
  }

  const expected = Buffer.from(env.rag.apiKey);
  const actual = Buffer.from(header);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    fail(res, ERROR_MAP.UNAUTHORIZED);
    return;
  }

  next();
}
