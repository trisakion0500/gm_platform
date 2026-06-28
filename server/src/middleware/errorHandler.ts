import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

interface HttpError extends Error {
  status?: number;
}

export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction, // Express가 4-인자 함수를 에러 미들웨어로 인식하는 조건이므로 _next는 반드시 선언해야 함
): void {
  const status = err.status ?? 500;

  if (status >= 500) {
    // 5xx는 서버 버그이므로 스택 포함 error 레벨, 4xx는 클라이언트 오류이므로 warn 레벨
    logger.error(`${req.method} ${req.url} - ${err.message}`, err.stack);
  } else {
    logger.warn(`${req.method} ${req.url} - ${status} ${err.message}`);
  }

  // 5xx 응답에는 내부 오류 메시지를 노출하지 않음
  res.status(status).json({
    success: false,
    message: status >= 500 ? "서버 오류가 발생했습니다." : err.message,
  });
}
