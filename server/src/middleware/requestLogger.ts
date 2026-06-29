import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { maskBody } from "../utils/mask";

/**
 * 요청마다 메서드·URL·body(민감 필드 마스킹)·상태코드·소요시간을 로깅하는 미들웨어.
 * @author trisakion
 * @param req Express Request 객체
 * @param res Express Response 객체
 * @param next 다음 미들웨어 함수
 * @returns void
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  const body = req.body && Object.keys(req.body).length > 0
    ? ` body=${JSON.stringify(maskBody(req.body))}`
    : "";
  logger.info(`${req.method} ${req.originalUrl}${body}`);

  res.on("finish", () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
  });

  next();
}
