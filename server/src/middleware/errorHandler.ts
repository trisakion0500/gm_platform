import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { AppError } from "../types";
import { ERROR_MAP } from "../constants/errors";

/**
 * 전역 오류 처리 미들웨어.
 * AppError/DBError는 result·message 형태로 응답하고,
 * 예상치 못한 예외는 내부 메시지를 노출하지 않고 500으로 처리한다.
 * @author trisakion
 * @param err 발생한 오류 객체
 * @param req Express Request 객체
 * @param res Express Response 객체
 * @param _next Express NextFunction — 4인자 함수 시그니처를 유지하기 위해 반드시 선언해야 한다
 * @returns void
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.httpStatus >= 500) {
      logger.error(`${req.method} ${req.url} - [${err.name}] ${err.message}`, err.stack);
    } else {
      logger.warn(`${req.method} ${req.url} - ${err.httpStatus} [${err.name}:${err.result}] ${err.message}`);
    }
    res.status(err.httpStatus).json({ result: err.result, message: err.message });
    return;
  }

  // 예상하지 못한 예외 — 5xx 응답에는 내부 오류 메시지를 노출하지 않음
  logger.error(`${req.method} ${req.url} - ${err.message}`, err.stack);
  res.status(ERROR_MAP[50000].httpStatus).json({ result: 50000, message: ERROR_MAP[50000].message });
}
