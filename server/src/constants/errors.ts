import { AppError, DBError } from '../types';

/**
 * 애플리케이션 전체에서 사용하는 오류 코드 정의.
 * 오류 코드 → 메시지·HTTP 상태코드를 한 곳에서 관리한다.
 * @author trisakion
 */
export const ERROR_MAP = {
  // 인증
  /** 로그인 ID 미존재 또는 비밀번호 불일치 (의도적으로 동일 메시지로 처리) */
  10001: { message: '로그인 실패',                                httpStatus: 401 },
  /** 비밀번호 변경 시 현재 비밀번호 불일치 */
  10002: { message: '비밀번호 불일치',                            httpStatus: 401 },
  /** Access Token 만료 */
  10003: { message: 'Access Token 만료',                        httpStatus: 401 },
  /** Authorization 헤더 없음 또는 유효하지 않은 토큰 */
  10004: { message: '로그인 필요',                               httpStatus: 401 },
  /** 가입승인대기 계정 (status=0) */
  10005: { message: '가입승인대기',                               httpStatus: 401 },
  /** 가입반려 계정 (status=2) */
  10006: { message: '가입반려',                                   httpStatus: 401 },
  /** 사용중지 계정 (status=3) */
  10007: { message: '사용중지 계정',                              httpStatus: 401 },
  /** Refresh Token 만료 또는 존재하지 않음 */
  10008: { message: 'Refresh Token 만료',                       httpStatus: 401 },
  /** 세션 없음 또는 로그아웃된 세션 */
  10009: { message: '유효하지 않은 Session',                     httpStatus: 401 },
  // 권한
  /** 해당 리소스에 대한 접근 권한 없음 */
  20001: { message: '권한이 없습니다.',                           httpStatus: 403 },
  // 입력값 오류
  /** 필수 입력값 누락 */
  30001: { message: '필수 입력값이 누락되었습니다.',               httpStatus: 400 },
  /** 입력값 형식 오류 */
  30002: { message: '입력값 형식이 올바르지 않습니다.',            httpStatus: 400 },
  /** 허용되지 않는 값 */
  30003: { message: '허용되지 않는 값입니다.',                    httpStatus: 400 },
  // 조회 대상 없음
  /** 존재하지 않거나 비활성 상태인 회사 */
  31001: { message: '존재하지 않는 회사입니다.',                   httpStatus: 404 },
  /** 존재하지 않거나 비활성 상태인 프로젝트 */
  31002: { message: '존재하지 않는 프로젝트입니다.',               httpStatus: 404 },
  /** user_id로 사용자를 찾을 수 없음 */
  31003: { message: '사용자를 찾을 수 없습니다.',                  httpStatus: 404 },
  /** 중복 데이터 */
  32001: { message: '이미 사용 중인 값입니다.',                    httpStatus: 400 },
  // 시스템
  /** 예상치 못한 서버 오류 */
  50000: { message: '서버 오류가 발생했습니다.',                   httpStatus: 500 },
  /** SP 내부 SQLEXCEPTION 발생 (RESULT=99) */
  50001: { message: 'DB 오류',                                   httpStatus: 500 },
} as const;

/** ERROR_MAP의 키 타입 */
export type ErrorCode = keyof typeof ERROR_MAP;

/**
 * 오류 코드로 AppError를 생성한다.
 * @author trisakion
 * @param code ERROR_MAP에 정의된 오류 코드
 * @returns AppError 인스턴스
 */
export const toAppError = (code: ErrorCode): AppError => {
  const { message, httpStatus } = ERROR_MAP[code];
  return new AppError(code, message, httpStatus);
};

/**
 * 오류 코드로 DBError를 생성한다.
 * @author trisakion
 * @param code ERROR_MAP에 정의된 오류 코드
 * @returns DBError 인스턴스
 */
export const toDBError = (code: ErrorCode): DBError => {
  const { message, httpStatus } = ERROR_MAP[code];
  return new DBError(code, message, httpStatus);
};
