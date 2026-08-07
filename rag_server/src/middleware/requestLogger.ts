import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

/**
 * 요청마다 메서드·URL·body·상태코드·소요시간을 로깅하는 미들웨어.
 * @param req Express Request 객체
 * @param res Express Response 객체
 * @param next 다음 미들웨어 함수
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  const body = req.body && Object.keys(req.body).length > 0
    ? ` body=${JSON.stringify(req.body)}`
    : "";
  logger.debug(`${req.method} ${req.originalUrl}${body}`);

  res.on("finish", () => {
    const ms = Date.now() - start;
    logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
  });

  next();
}
