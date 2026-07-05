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
  /** 휴대폰 번호 (DB에는 AES-256-CBC 암호문(Base64)으로 저장, 서비스 레이어에서 복호화) */
  phone_number: string;
  /** 부서 (없으면 null) */
  department: string | null;
  /** 직급 (없으면 null) */
  position: string | null;
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
  /** 휴대폰 번호 (DB에는 AES-256-CBC 암호문(Base64)으로 저장, 서비스 레이어에서 복호화) */
  phone_number: string;
  /** 부서 (없으면 null) */
  department: string | null;
  /** 직급 (없으면 null) */
  position: string | null;
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
 * user_role 테이블 조회 행 타입. user/project JOIN 포함.
 * @author trisakion
 */
export interface UserRoleRow {
  /** 사용자 ID */
  user_id: number;
  /** 로그인 ID */
  login_id: string;
  /** 사용자명 */
  user_name: string;
  /** 프로젝트 ID */
  project_id: number;
  /** 프로젝트 코드 */
  project_code: string;
  /** 프로젝트명 */
  project_name: string;
  /** 역할 코드 (20=DEVELOPER, 30=APPROVER, 40=OPERATOR) */
  role_code: number;
  /** 상태 (1=사용, 0=중지) */
  status: number;
  /** 생성 일시 */
  created_at: Date;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * code_group 테이블 조회 행 타입.
 * @author trisakion
 */
export interface CodeGroupRow {
  /** 코드 그룹 ID */
  code_group_id: number;
  /** 소속 프로젝트 ID */
  project_id: number;
  /** 코드 그룹 코드 */
  code_group_code: string;
  /** 코드 그룹명 */
  code_group_name: string;
  /** 설명 */
  description: string | null;
  /** 상태 (1=사용, 0=중지) */
  status: number;
  /** 생성자 user_id */
  created_by: number;
  /** 수정자 user_id */
  updated_by: number;
  /** 생성 일시 */
  created_at: Date;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * code_item 테이블 조회 행 타입.
 * @author trisakion
 */
export interface CodeItemRow {
  /** 코드 아이템 ID */
  code_item_id: number;
  /** 소속 코드 그룹 ID */
  code_group_id: number;
  /** 코드 값 */
  code_value: string;
  /** 코드명 */
  code_name: string;
  /** 설명 */
  description: string | null;
  /** 표시 순서 */
  display_order: number;
  /** 상태 (1=사용, 0=중지) */
  status: number;
  /** 생성자 user_id */
  created_by: number;
  /** 수정자 user_id */
  updated_by: number;
  /** 생성 일시 */
  created_at: Date;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * SP_GET_ACTIVE_CODE_ITEMS 반환 행 타입. 렌더링용 최소 필드만 포함.
 * @author trisakion
 */
export interface ActiveCodeItemRow {
  /** 코드 값 */
  code_value: string;
  /** 코드명 */
  code_name: string;
}

/**
 * SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS 반환 행(flat) 타입.
 * 코드그룹당 아이템 수만큼 행이 반복되며, 아이템이 없는 그룹은 code_value/code_name이 null.
 * @author trisakion
 */
export interface ActiveCodeGroupItemFlatRow {
  /** 코드 그룹 ID */
  code_group_id: number;
  /** 코드 그룹 코드 */
  code_group_code: string;
  /** 코드 그룹명 */
  code_group_name: string;
  /** 코드 값 (그룹에 아이템이 없으면 null) */
  code_value: string | null;
  /** 코드명 (그룹에 아이템이 없으면 null) */
  code_name: string | null;
}

/**
 * GET /code-groups/active-with-items 응답 타입 (flat 행을 그룹별로 묶은 결과).
 * @author trisakion
 */
export interface ActiveCodeGroupWithItems {
  /** 코드 그룹 ID */
  code_group_id: number;
  /** 코드 그룹 코드 */
  code_group_code: string;
  /** 코드 그룹명 */
  code_group_name: string;
  /** 해당 그룹의 활성 아이템 목록 */
  items: ActiveCodeItemRow[];
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
 * api 테이블 조회 행 타입
 * @author trisakion
 */
export interface APIRow {
  /** API ID */
  api_id: number;
  /** 프로젝트 ID(수정불가) */
  project_id: number;
  /** API 고유 코드 */
  api_code: string;
  /** API 이름 */
  api_name: string;
  /** 서비스 호출 Endpoint */
  endpoint: string;
  /** API 설명 */
  description: string | null;
  /** API 운영 단계 (20:개발, 30:승인, 40:운영) */
  api_stage: number;
  /** 승인 필요 여부 (0:즉시 실행, 1:승인 필요) */
  is_required_approval: number;
  /** 응답 표시 방식 (1:KEY_VALUE, 2:GRID) */
  response_view_type: number;
  /** 상태 (1:사용, 0:중지) */
  status: number;
  /** 화면 표시 순서 */
  display_order: number;
  /** 생성자 사용자 ID */
  created_by: number;
  /** 수정자 사용자 ID */
  updated_by: number;
  /** 생성일시 */
  created_at: Date;
  /** 수정일시 */
  updated_at: Date;
}

/**
 * api_request 테이블 조회 행 타입.
 * @author trisakion
 */
export interface APIRequestRow {
  /** API 요청 파라미터 ID */
  api_request_id: number;
  /** 소속 API ID */
  api_id: number;
  /** 파라미터명 (JSON Key) */
  parameter_name: string;
  /** 화면 표시명 */
  parameter_label: string;
  /** 데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON) */
  parameter_type: number;
  /** 입력 컴포넌트 타입 (1:TEXT, 2:NUMBER, 3:DATE, 4:DATETIME, 5:SELECT, 6:RADIO, 7:CHECKBOX) */
  component_type: number;
  /** 코드 그룹 ID (0:사용안함) */
  code_group_id: number;
  /** 필수 여부 (0:선택, 1:필수) */
  is_required: number;
  /** 파라미터 설명 */
  description: string | null;
  /** 화면 표시 순서 */
  display_order: number;
  /** 상태 (1:사용, 0:중지) */
  status: number;
  /** 생성자 사용자 ID */
  created_by: number;
  /** 수정자 사용자 ID */
  updated_by: number;
  /** 생성 일시 */
  created_at: Date;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * api_response 테이블 조회 행 타입.
 * @author trisakion
 */
export interface APIResponseRow {
  /** API 응답 정의 ID */
  api_response_id: number;
  /** 소속 API ID */
  api_id: number;
  /** 응답 항목명 (JSON Key) */
  parameter_name: string;
  /** 화면 표시명 */
  parameter_label: string;
  /** 데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON) */
  parameter_type: number;
  /** 코드 그룹 ID (0:사용안함) */
  code_group_id: number;
  /** 응답 항목 설명 */
  description: string | null;
  /** 화면 표시 순서 */
  display_order: number;
  /** 상태 (1:사용, 0:중지) */
  status: number;
  /** 생성자 사용자 ID */
  created_by: number;
  /** 수정자 사용자 ID */
  updated_by: number;
  /** 생성 일시 */
  created_at: Date;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * api_execution 테이블 조회 행 타입.
 * 목록 조회 시 request_json/response_data는 포함되지 않는다.
 * @author trisakion
 */
export interface APIExecutionRow {
  /** 실행 이력 ID */
  api_execution_id: number;
  /** 소속 API ID */
  api_id: number;
  /** API 이름 스냅샷 */
  api_name: string;
  /** Endpoint 스냅샷 */
  endpoint: string;
  /** 요청자 user_id (취소 버튼 등 본인 여부 판단용) */
  request_user_id: number;
  /** 요청자 이름 */
  request_user_name: string;
  /** 승인/반려자 이름 (없으면 null) */
  approve_user_name: string | null;
  /** 상태 (10:PENDING, 20:APPROVED, 30:REJECTED, 40:SUCCESS, 50:FAILED, 60:CANCELED) */
  status: number;
  /** 요청 파라미터 JSON (상세 조회 시만 포함) */
  request_json?: string;
  /** 응답 데이터 JSON (상세 조회 시만 포함, 없으면 null) */
  response_data?: string | null;
  /** 반려/취소 사유 (없으면 null) */
  reject_reason: string | null;
  /** 에러 메시지 (없으면 null) */
  error_message: string | null;
  /** 요청 일시 */
  requested_at: Date;
  /** 승인 일시 (없으면 null) */
  approved_at: Date | null;
  /** 실행 일시 (없으면 null) */
  executed_at: Date | null;
  /** 수정 일시 */
  updated_at: Date;
}

/**
 * log_audit 테이블 조회 행 타입.
 * @author trisakion
 */
export interface LogAuditRow {
  /** 감사 로그 ID */
  log_audit_id: number;
  /** 회사 ID */
  company_id: number;
  /** 프로젝트 ID (company/user 작업 시 null) */
  project_id: number | null;
  /** 프로젝트명 (project_id가 null이면 null) */
  project_name: string | null;
  /** 대상 테이블명 */
  table_name: string;
  /** 대상 PK (복합키는 JSON 문자열) */
  target_id: string;
  /** 대상 표시명 */
  target_name: string;
  /** 작업 유형 (10:CREATE, 20:UPDATE, 30:STATUS_CHANGE) */
  action_type: number;
  /** 변경 전 데이터 JSON (CREATE 시 null, 상세 조회 시만 포함) */
  before_json?: string | null;
  /** 변경 후 데이터 JSON (상세 조회 시만 포함) */
  after_json?: string;
  /** 작업 수행 사용자 이름 (탈퇴 등으로 사용자가 없으면 null) */
  created_by_name: string | null;
  /** 생성 일시 */
  created_at: Date;
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
