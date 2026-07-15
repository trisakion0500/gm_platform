import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import { env } from "../config/env";
import { fail } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";

/**
 * X-API-Key 헤더를 env.apiKey와 상수 시간 비교로 검증한다.
 * env.apiKey가 설정되지 않은 경우(로컬 개발용) 검증을 건너뛴다.
 * 헤더 누락·길이 불일치·값 불일치 모두 동일한 401(UNAUTHORIZED)로 응답해 원인을 노출하지 않는다.
 * @param req Express Request 객체
 * @param res Express Response 객체
 * @param next 다음 미들웨어 함수
 */
export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!env.apiKey) {
    next();
    return;
  }

  const header = req.header("X-API-Key");
  if (!header) {
    fail(res, ERROR_MAP.UNAUTHORIZED);
    return;
  }

  const expected = Buffer.from(env.apiKey);
  const actual = Buffer.from(header);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    fail(res, ERROR_MAP.UNAUTHORIZED);
    return;
  }

  next();
}
