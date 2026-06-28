import { Response } from 'express';

/**
 * 성공 응답을 전송한다. 응답 형식: { result: 0, data }
 * @author trisakion
 * @param res Express Response 객체
 * @param data 응답에 포함할 데이터 (null 허용)
 * @param status HTTP 상태 코드 (기본값: 200)
 * @returns void
 */
export const success = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ result: 0, data });
};

/**
 * 실패 응답을 전송한다. 응답 형식: { result, message }
 * @author trisakion
 * @param res Express Response 객체
 * @param result 비즈니스 오류 코드
 * @param message 오류 메시지
 * @param httpStatus HTTP 상태 코드
 * @returns void
 */
export const fail = (res: Response, result: number, message: string, httpStatus: number): void => {
  res.status(httpStatus).json({ result, message });
};

/**
 * Date 또는 문자열을 'YYYY-MM-DD HH:mm:ss' 형식으로 변환한다.
 * @author trisakion
 * @param d 변환할 Date 객체 또는 날짜 문자열, null 허용
 * @returns 'YYYY-MM-DD HH:mm:ss' 형식의 문자열, null이면 null
 */
export function formatDatetime(d: Date | string | null): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 19);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
