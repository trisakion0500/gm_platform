import { Response } from "express";
import { ErrorEntry } from "../constants/errors";

/**
 * 성공 응답을 전송한다. 응답 형식: { result: 0, message: 'OK', data: [...] }
 * @param res Express Response 객체
 * @param data 응답에 포함할 데이터 배열
 */
export const success = (res: Response, data: unknown[]): void => {
  res.status(200).json({ result: 0, message: "OK", data });
};

/**
 * 실패 응답을 전송한다. 응답 형식: { result, message, data: [] }
 * @param res Express Response 객체
 * @param entry ERROR_MAP에 정의된 오류 코드
 */
export const fail = (res: Response, entry: ErrorEntry): void => {
  res.status(entry.httpStatus).json({ result: entry.code, message: entry.message, data: [] });
};

/**
 * Date 또는 문자열을 'YYYY-MM-DD HH:mm:ss' 형식으로 변환한다.
 * Date는 로컬(Node 프로세스 시간대) 구성요소로 뽑는다 — DB의 timezone:'local' 설정과 일치시키기 위함.
 * @param d 변환할 Date 객체 또는 날짜 문자열, null 허용
 * @returns 'YYYY-MM-DD HH:mm:ss' 형식의 문자열, null이면 null
 */
export function formatDatetime(d: Date | string | null): string | null {
  if (!d)
    return null;
  if (typeof d === "string")
    return d.slice(0, 19).replace("T", " ");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
