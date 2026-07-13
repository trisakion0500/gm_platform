import { AppError, DBError } from "../types";

export const ERROR_MAP = {
  INVALID_VALUE:      { code: 30003, message: "허용되지 않는 값입니다.",     httpStatus: 400 },
  USER_NOT_FOUND:     { code: 31001, message: "존재하지 않는 유저입니다.",   httpStatus: 404 },
  INSUFFICIENT_BALANCE: { code: 31002, message: "재화 잔액이 부족합니다.",   httpStatus: 400 },
  DB_ERROR:           { code: 50001, message: "DB 오류",                  httpStatus: 500 },
};

export type ErrorCode = keyof typeof ERROR_MAP;
export type ErrorEntry = (typeof ERROR_MAP)[ErrorCode];

export const toAppError = (entry: ErrorEntry): AppError => {
  return new AppError(entry.code, entry.message, entry.httpStatus);
};

export const toDBError = (entry: ErrorEntry): DBError => {
  return new DBError(entry.code, entry.message, entry.httpStatus);
};
