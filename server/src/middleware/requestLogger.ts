import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

/**
 * 요청마다 메서드·URL·상태코드·소요시간을 로깅하는 미들웨어.
 * 응답이 완전히 전송된 시점(finish 이벤트)에 로그를 기록하여 상태코드와 소요시간을 정확히 측정한다.
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

  res.on("finish", () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.url} ${res.statusCode} - ${ms}ms`);
  });

  next();
}
