import { Response } from 'express';
import { ERROR_MAP, ErrorEntry } from '../constants/errors';
import logger from './logger';
import { maskBody } from './mask';

/**
 * 성공 응답을 전송한다. 응답 형식: { result: 0, data }
 * @author trisakion
 * @param res Express Response 객체
 * @param data 응답에 포함할 데이터 (null 허용)
 * @param status HTTP 상태 코드 (기본값: 200)
 * @returns void
 */
export const success = (res: Response, data: unknown, status = 200): void => {
  const body = { result: 0, data };
  logger.info(`res: ${JSON.stringify({ result: 0, data: maskBody(data) })}`);
  res.status(status).json(body);
};

/**
 * 실패 응답을 전송한다. ERROR_MAP에서 message·httpStatus를 조회하여 응답한다.
 * 응답 형식: { result, message }
 * @author trisakion
 * @param res Express Response 객체
 * @param code ERROR_MAP에 정의된 오류 코드
 * @returns void
 */
export const fail = (res: Response, entry: ErrorEntry): void => {
  const body = { result: entry.code, message: entry.message };
  logger.warn(`res: ${JSON.stringify(body)}`);
  res.status(entry.httpStatus).json(body);
};

/**
 * Date 또는 문자열을 'YYYY-MM-DD HH:mm:ss' 형식으로 변환한다.
 * @author trisakion
 * @param d 변환할 Date 객체 또는 날짜 문자열, null 허용
 * @returns 'YYYY-MM-DD HH:mm:ss' 형식의 문자열, null이면 null
 */
export function formatDatetime(d: Date | string | null): string | null {
  if (!d)
    return null;
  if (typeof d === 'string')
    return d.slice(0, 19).replace('T', ' ');
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
