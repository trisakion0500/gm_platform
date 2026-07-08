import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ERROR_MAP } from '../constants/errors';
import { fail } from '../utils/response';
import { env } from '../config/env';

/**
 * 로그인/회원가입 브루트포스 방지용 리미터. IP당 windowMs 동안 max회.
 * @author trisakion
 */
export const loginLimiter = rateLimit({
  windowMs: env.loginRateLimit.windowMs,
  max: env.loginRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    fail(res, ERROR_MAP.TOO_MANY_REQUESTS);
  },
});
