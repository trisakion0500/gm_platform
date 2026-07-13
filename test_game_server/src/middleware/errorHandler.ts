import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { AppError } from "../types";
import { ERROR_MAP } from "../constants/errors";

/**
 * 전역 오류 처리 미들웨어. 응답 형식: { result, message, data: [] }
 * @param err 발생한 오류 객체
 * @param req Express Request 객체
 * @param res Express Response 객체
 * @param _next 4인자 함수 시그니처 유지용
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.httpStatus >= 500) {
      logger.error(`${req.method} ${req.url} - [${err.name}:${err.result}] ${err.message}`, err.stack);
    } else {
      logger.warn(`${req.method} ${req.url} - ${err.httpStatus} [${err.name}:${err.result}] ${err.message}`);
    }
    res.status(err.httpStatus).json({ result: err.result, message: err.message, data: [] });
    return;
  }

  logger.error(`${req.method} ${req.url} - ${err.message}`, err.stack);
  res.status(500).json({ result: ERROR_MAP.DB_ERROR.code, message: "서버 내부 오류", data: [] });
}
