import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';
import { ERROR_MAP } from '../constants/errors';

/**
 * 역할 기반 접근 제어 미들웨어. authenticate 이후에 사용한다.
 * req.user.role_code가 허용된 역할 목록에 없으면 403을 반환한다.
 * @author trisakion
 * @param roleCodes 허용할 역할 코드 목록 (10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR)
 * @returns Express 미들웨어 함수
 */
export function requireRole(...roleCodes: number[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roleCodes.includes(req.user.role_code)) {
      fail(res, ERROR_MAP.FORBIDDEN);
      return;
    }
    next();
  };
}
