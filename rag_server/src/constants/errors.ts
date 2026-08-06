import { AppError } from "../types";

export const ERROR_MAP = {
  UNAUTHORIZED:   { code: 10001, message: "유효하지 않은 API Key입니다.",              httpStatus: 401 },
  INVALID_VALUE:  { code: 30003, message: "허용되지 않는 값입니다.",                   httpStatus: 400 },
  MODEL_LOADING:  { code: 50002, message: "모델을 로드하는 중입니다. 잠시 후 다시 시도하세요.", httpStatus: 503 },
  INTERNAL_ERROR: { code: 50001, message: "서버 내부 오류",                          httpStatus: 500 },
};

export type ErrorCode = keyof typeof ERROR_MAP;
export type ErrorEntry = (typeof ERROR_MAP)[ErrorCode];

export const toAppError = (entry: ErrorEntry): AppError => {
  return new AppError(entry.code, entry.message, entry.httpStatus);
};
