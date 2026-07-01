import { AppError, DBError } from '../types';

/**
 * 애플리케이션 전체에서 사용하는 오류 코드 정의.
 * 오류 코드 → 비즈니스 코드·메시지·HTTP 상태코드를 한 곳에서 관리한다.
 * @author trisakion
 */
export const ERROR_MAP = {
  // 인증
  /** 로그인 ID 미존재 또는 비밀번호 불일치 (의도적으로 동일 메시지로 처리) */
  LOGIN_FAILED:          { code: 10001, message: '로그인 실패',                         httpStatus: 401 },
  /** 비밀번호 변경 시 현재 비밀번호 불일치 */
  PASSWORD_MISMATCH:     { code: 10002, message: '비밀번호 불일치',                      httpStatus: 401 },
  /** Access Token 만료 */
  ACCESS_TOKEN_EXPIRED:  { code: 10003, message: 'Access Token 만료',                  httpStatus: 401 },
  /** Authorization 헤더 없음 또는 유효하지 않은 토큰 */
  UNAUTHORIZED:          { code: 10004, message: '로그인 필요',                         httpStatus: 401 },
  /** 가입승인대기 계정 (status=0) */
  PENDING_APPROVAL:      { code: 10005, message: '가입승인대기',                        httpStatus: 401 },
  /** 가입반려 계정 (status=2) */
  SIGNUP_REJECTED:       { code: 10006, message: '가입반려',                            httpStatus: 401 },
  /** 사용중지 계정 (status=3) */
  ACCOUNT_SUSPENDED:     { code: 10007, message: '사용중지 계정',                       httpStatus: 401 },
  /** Refresh Token 만료 또는 존재하지 않음 */
  REFRESH_TOKEN_EXPIRED: { code: 10008, message: 'Refresh Token 만료',                 httpStatus: 401 },
  /** 세션 없음 또는 로그아웃된 세션 */
  INVALID_SESSION:       { code: 10009, message: '유효하지 않은 Session',               httpStatus: 401 },
  // 권한
  /** 해당 리소스에 대한 접근 권한 없음 */
  FORBIDDEN:             { code: 20001, message: '권한이 없습니다.',                     httpStatus: 403 },
  // 입력값 오류
  /** 필수 입력값 누락 */
  REQUIRED_MISSING:      { code: 30001, message: '필수 입력값이 누락되었습니다.',          httpStatus: 400 },
  /** 입력값 형식 오류 */
  INVALID_FORMAT:        { code: 30002, message: '입력값 형식이 올바르지 않습니다.',       httpStatus: 400 },
  /** 허용되지 않는 값 */
  INVALID_VALUE:         { code: 30003, message: '허용되지 않는 값입니다.',               httpStatus: 400 },
  // 조회 대상 없음
  /** 존재하지 않거나 비활성 상태인 회사 */
  COMPANY_NOT_FOUND:     { code: 31001, message: '존재하지 않는 회사입니다.',             httpStatus: 404 },
  /** 존재하지 않거나 비활성 상태인 프로젝트 */
  PROJECT_NOT_FOUND:     { code: 31002, message: '존재하지 않는 프로젝트입니다.',          httpStatus: 404 },
  /** user_id로 사용자를 찾을 수 없음 */
  USER_NOT_FOUND:        { code: 31003, message: '사용자를 찾을 수 없습니다.',            httpStatus: 404 },
  /** 존재하지 않는 코드 그룹 */
  CODE_GROUP_NOT_FOUND:  { code: 31004, message: '존재하지 않는 코드 그룹입니다.',        httpStatus: 404 },
  /** 존재하지 않는 코드 아이템 */
  CODE_ITEM_NOT_FOUND:   { code: 31005, message: '존재하지 않는 코드 아이템입니다.',      httpStatus: 404 },
  /** 존재하지 않는 API */
  API_NOT_FOUND:         { code: 31006, message: '존재하지 않는 API입니다.',             httpStatus: 404 },
  /** 존재하지 않는 API Request 파라미터 */
  API_REQUEST_NOT_FOUND: { code: 31007, message: '존재하지 않는 API Request 파라미터입니다.', httpStatus: 404 },
  /** 존재하지 않는 API Response 파라미터 */
  API_RESPONSE_NOT_FOUND:{ code: 31008, message: '존재하지 않는 API Response 파라미터입니다.', httpStatus: 404 },
  /** 존재하지 않는 API 실행 이력 */
  API_EXECUTION_NOT_FOUND: { code: 31009, message: '존재하지 않는 API 실행 이력입니다.',    httpStatus: 404 },
  /** 존재하지 않는 감사 로그 */
  LOG_AUDIT_NOT_FOUND:     { code: 31010, message: '존재하지 않는 감사 로그입니다.',         httpStatus: 404 },
  /** 중복 데이터 */
  DUPLICATE_VALUE:       { code: 32001, message: '이미 사용 중인 값입니다.',              httpStatus: 400 },
  // 시스템
  /** 예상치 못한 서버 오류 */
  SERVER_ERROR:          { code: 50000, message: '서버 오류가 발생했습니다.',             httpStatus: 500 },
  /** SP 내부 SQLEXCEPTION 발생 (RESULT=99) */
  DB_ERROR:              { code: 50001, message: 'DB 오류',                            httpStatus: 500 },
} as const;

/** ERROR_MAP의 키 타입 */
export type ErrorCode = keyof typeof ERROR_MAP;
/** ERROR_MAP의 단일 항목 타입 */
export type ErrorEntry = (typeof ERROR_MAP)[ErrorCode];

/**
 * ERROR_MAP 항목으로 AppError를 생성한다.
 * @author trisakion
 * @param entry ERROR_MAP.KEY 형태로 전달
 * @returns AppError 인스턴스
 */
export const toAppError = (entry: ErrorEntry): AppError => {
  return new AppError(entry.code, entry.message, entry.httpStatus);
};

/**
 * ERROR_MAP 항목으로 DBError를 생성한다.
 * @author trisakion
 * @param entry ERROR_MAP.KEY 형태로 전달
 * @returns DBError 인스턴스
 */
export const toDBError = (entry: ErrorEntry): DBError => {
  return new DBError(entry.code, entry.message, entry.httpStatus);
};
