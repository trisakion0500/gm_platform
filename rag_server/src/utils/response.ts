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
