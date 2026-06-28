import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  // 응답이 완전히 전송된 시점에 실행 — 그래야 statusCode와 소요 시간을 정확히 알 수 있음
  res.on("finish", () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.url} ${res.statusCode} - ${ms}ms`);
  });

  next();
}
