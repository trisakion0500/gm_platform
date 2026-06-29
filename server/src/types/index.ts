/**
 * 인증 미들웨어가 req.user에 설정하는 사용자 컨텍스트.
 * 인증이 필요한 모든 라우트에서 req.user를 통해 접근한다.
 * @author trisakion
 */
export interface RequestUser {
  /** 사용자 ID */
  user_id: number;
  /** 소속 회사 ID */
  company_id: number;
  /** 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR) */
  role_code: number;
  /** 현재 세션 ID */
  session_id: number;
}

/**
 * Access Token(JWT)의 페이로드 구조.
 * signAccessToken 발급 및 verifyAccessToken 검증 시 사용한다.
 * @author trisakion
 */
export interface AccessTokenPayload {
  /** 토큰 고유 식별자 (UUID v4) — 세션 조회 키로 사용 */
  jti: string;
  /** 사용자 ID */
  user_id: number;
  /** 소속 회사 ID */
  company_id: number;
  /** 역할 코드 */
  role_code: number;
}

/**
 * user 테이블 전체 컬럼을 나타내는 DB 조회 행 타입.
 * password_hash가 포함되므로 API 응답에 직접 사용하지 않는다.
 * @author trisakion
 */
export interface UserRow {
  /** 사용자 ID */
  user_id: number;
  /** 소속 회사 ID */
  company_id: number;
  /** 가입 신청 프로젝트 ID (없으면 null) */
  requested_project_id: number | null;
  /** 로그인 ID */
  login_id: string;
  /** bcrypt 해시된 비밀번호 */
  password_hash: string;
  /** 사용자명 */
  user_name: string;
  /** 이메일 */
  email: string;
  /** 계정 상태 (0=가입승인대기, 1=정상, 2=가입반려, 3=사용중지) */
  status: number;
  /** 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR) */
  role_code: number;
  /** 마지막 로그인 일시 (없으면 null) */
  last_login_at: Date | null;
  /** 생성 일시 */
  created_at: Date;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * API 응답용 사용자 공개 정보 타입. password_hash를 제외한 UserRow.
 * @author trisakion
 */
export interface UserPublicRow extends Omit<UserRow, "password_hash"> {}

/**
 * user_session 테이블에서 인증 미들웨어가 필요로 하는 최소 조회 행 타입.
 * @author trisakion
 */
export interface SessionRow {
  /** 세션 ID */
  session_id: number;
  /** 사용자 ID */
  user_id: number;
  /** 세션 상태 (0=로그아웃, 1=사용중) */
  session_status: number;
  /** 사용자 계정 상태 (0=가입승인대기, 1=정상, 2=가입반려, 3=사용중지) */
  user_status: number;
}

/**
 * Refresh Token 검증 시 사용하는 세션 + 사용자 결합 조회 행 타입.
 * Access Token 재발급에 필요한 company_id, role_code를 추가로 포함한다.
 * @author trisakion
 */
export interface SessionWithUserRow extends SessionRow {
  /** 소속 회사 ID */
  company_id: number;
  /** 역할 코드 */
  role_code: number;
}

/**
 * project 테이블 조회 행 타입. company JOIN 포함.
 * @author trisakion
 */
export interface ProjectRow {
  /** 프로젝트 ID */
  project_id: number;
  /** 소속 회사 ID */
  company_id: number;
  /** 소속 회사 코드 */
  company_code: string;
  /** 소속 회사명 */
  company_name: string;
  /** 프로젝트 코드 */
  project_code: string;
  /** 프로젝트명 */
  project_name: string;
  /** API Base URL */
  api_base_url: string;
  /** 설명 */
  description: string | null;
  /** 상태 (1=사용, 0=중지) */
  status: number;
  /** 생성 일시 */
  created_at: Date;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * user 테이블 관리 API용 조회 행 타입. company JOIN 포함, password_hash 제외.
 * @author trisakion
 */
export interface UserAdminRow {
  /** 사용자 ID */
  user_id: number;
  /** 소속 회사 ID */
  company_id: number;
  /** 소속 회사 코드 */
  company_code: string;
  /** 소속 회사명 */
  company_name: string;
  /** 가입 신청 프로젝트 ID (상세/수정 응답에만 포함) */
  requested_project_id?: number | null;
  /** 로그인 ID */
  login_id: string;
  /** 사용자명 */
  user_name: string;
  /** 이메일 */
  email: string;
  /** 계정 상태 (0=가입승인대기, 1=정상, 2=가입반려, 3=사용중지) */
  status: number;
  /** 마지막 로그인 일시 (없으면 null) */
  last_login_at: Date | null;
  /** 생성 일시 */
  created_at: Date;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * company 테이블 조회 행 타입.
 * @author trisakion
 */
export interface CompanyRow {
  /** 회사 ID */
  company_id: number;
  /** 회사 코드 */
  company_code: string;
  /** 회사명 */
  company_name: string;
  /** 설명 */
  description: string | null;
  /** 상태 (1=사용, 0=중지) */
  status: number;
  /** 생성 일시 */
  created_at: Date;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * 비즈니스 로직 오류를 표현하는 기본 오류 클래스.
 * result(비즈니스 오류 코드)와 httpStatus를 함께 보유하여 errorHandler에서 일관된 응답을 생성한다.
 * @author trisakion
 */
export class AppError extends Error {
  constructor(
    /** 비즈니스 오류 코드 (API 응답의 result 필드에 포함) */
    readonly result: number,
    message: string,
    /** HTTP 상태 코드 */
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * DB 레이어에서 발생하는 오류를 표현하는 클래스. AppError를 상속한다.
 * errorHandler에서 instanceof AppError로 일괄 처리되며, err.name으로 출처를 구분할 수 있다.
 * @author trisakion
 */
export class DBError extends AppError {
  constructor(result: number, message: string, httpStatus: number) {
    super(result, message, httpStatus);
    this.name = "DBError";
  }
}
