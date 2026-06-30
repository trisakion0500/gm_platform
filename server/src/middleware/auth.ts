import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { fail } from '../utils/response';
import { getSessionByJti } from '../db/auth.db';
import { ERROR_MAP, ErrorEntry } from '../constants/errors';

/**
 * Bearer 토큰을 검증하고 req.user를 설정하는 인증 미들웨어.
 * 검증 실패 시 다음 오류 코드로 401 응답을 반환한다.
 * - 10003: Access Token 만료
 * - 10004: 토큰 없음 또는 유효하지 않은 토큰
 * - 10005: 가입승인대기 계정
 * - 10006: 가입반려 계정
 * - 10007: 사용중지 계정
 * - 10009: 세션 없음 또는 로그아웃된 세션
 * @author trisakion
 * @param req Authorization 헤더에서 Bearer 토큰을 추출한다
 * @param res 인증 실패 시 401 응답
 * @param next 인증 성공 시 다음 미들웨어로 진행
 * @returns void
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    fail(res, ERROR_MAP.UNAUTHORIZED);
    return;
  }

  const token = header.slice(7);

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch (err: unknown) {
    const isExpired = err instanceof Error && err.name === 'TokenExpiredError';
    fail(res, isExpired ? ERROR_MAP.ACCESS_TOKEN_EXPIRED : ERROR_MAP.UNAUTHORIZED);
    return;
  }

  let session: Awaited<ReturnType<typeof getSessionByJti>>;
  try {
    session = await getSessionByJti(payload.jti);
  } catch (err) {
    next(err);
    return;
  }

  if (!session || session.session_status !== 1) {
    fail(res, ERROR_MAP.INVALID_SESSION);
    return;
  }

  if (session.user_status !== 1) {
    let entry: ErrorEntry = ERROR_MAP.UNAUTHORIZED;
    switch (session.user_status) {
      case 0: entry = ERROR_MAP.PENDING_APPROVAL; break;
      case 2: entry = ERROR_MAP.SIGNUP_REJECTED; break;
      case 3: entry = ERROR_MAP.ACCOUNT_SUSPENDED; break;
    }
    fail(res, entry);
    return;
  }

  req.user = {
    user_id: payload.user_id,
    company_id: payload.company_id,
    role_code: payload.role_code,
    session_id: session.session_id,
  };

  next();
}
