/** GM Platform 성공 응답 봉투. 응답 형식: { result: 0, data } */
export interface GmSuccessEnvelope<T> {
  result: 0;
  data: T;
}

/** GM Platform 실패 응답 봉투. 응답 형식: { result, message } */
export interface GmFailEnvelope {
  result: number;
  message: string;
}

export type GmEnvelope<T> = GmSuccessEnvelope<T> | GmFailEnvelope;

/** POST /auth/login 응답 데이터 */
export interface LoginResult {
  access_token: string;
  refresh_token: string;
  expired_at: string;
  role_code: number;
}

/** POST /auth/refresh 응답 데이터 */
export interface RefreshResult {
  access_token: string;
  expired_at: string;
  role_code: number;
}

/** GET /companies/active-header-data 소속 회사 항목 */
export interface ActiveCompany {
  company_id: number;
  company_name: string;
}

/** GET /companies/active-header-data 프로젝트 항목 — 로그인 계정이 실제 user_role을 가진 프로젝트만 반환(SUPER_ADMIN은 전체) */
export interface ActiveHeaderProject {
  project_id: number;
  company_id: number;
  project_name: string;
}

/** GET /companies/active-header-data 응답 데이터 */
export interface ActiveHeaderData {
  companies: ActiveCompany[];
  projects: ActiveHeaderProject[];
}

/** GET /apis/active 항목 */
export interface ActiveApi {
  api_id: number;
  api_name: string;
  api_stage: number;
}

/** GET /code-groups/active-with-items 코드 아이템 */
export interface ActiveCodeItem {
  code_value: string;
  code_name: string;
}

/** GET /code-groups/active-with-items 코드 그룹 */
export interface ActiveCodeGroup {
  code_group_id: number;
  code_group_code: string;
  code_group_name: string;
  items: ActiveCodeItem[];
}

/** api_execution 조회/실행 응답 (POST /apis/:id/execute, GET /api-executions 등 공통) */
export interface ApiExecution {
  api_execution_id: number;
  api_id: number;
  api_name: string;
  endpoint: string;
  is_required_approval: number;
  request_user_id: number;
  request_user_name: string;
  approve_user_name: string | null;
  status: number;
  request_json?: Record<string, unknown>;
  response_data?: Record<string, unknown> | Record<string, unknown>[] | null;
  reject_reason: string | null;
  error_message: string | null;
  requested_at: string;
  approved_at: string | null;
  executed_at: string | null;
  updated_at: string;
}

/** 페이지네이션 목록 응답 공통 형태 */
export interface PaginatedResponse<T> {
  page: number;
  page_size: number;
  total_count: number;
  items: T[];
}

/** GET /api-search 검색 결과 한 건 */
export interface ApiSearchResult {
  api_id: number;
  project_id: number;
  project_name: string;
  api_name: string;
  api_code: string;
  endpoint: string;
  score: number;
}

/** GET /log-audit-search 검색 결과 한 건 */
export interface LogAuditSearchResult {
  log_audit_id: number;
  table_name: string;
  target_id: string;
  target_name: string | null;
  action_type: number;
  project_name: string | null;
  created_by_name: string | null;
  created_at: string;
  score: number;
}

// ---- admin 도메인 (mcp_server_dev에는 없던 회사/프로젝트/사용자/역할배정 관리 타입) ----

/** GET /companies, GET /companies/:id, POST /companies, PATCH /companies/:id 응답 항목 */
export interface CompanyRow {
  company_id: number;
  company_code: string;
  company_name: string;
  description: string | null;
  status: number; // 1=사용, 0=중지
  created_at: string;
  updated_at: string;
}

/** GET /projects, GET /projects/:id, POST /projects, PATCH /projects/:id(/connection), POST /:id/api-key 응답 항목 */
export interface ProjectAdminRow {
  project_id: number;
  company_id: number;
  company_code: string;
  company_name: string;
  project_code: string;
  project_name: string;
  api_base_url: string;
  description: string | null;
  status: number; // 1=사용, 0=중지
  has_api_key: number; // 0=미발급, 1=발급됨
  created_at: string;
  updated_at: string;
}

/** POST /projects/:id/api-key 응답 — 평문 API 키는 이 응답에서만 1회 노출된다 */
export interface ProjectApiKeyResult extends ProjectAdminRow {
  api_key: string;
}

/** GET /users, GET /users/:id, PATCH /users/:id 응답 항목 (phone_number는 서버가 복호화해 평문으로 반환) */
export interface UserAdminRow {
  user_id: number;
  company_id: number;
  company_code: string;
  company_name: string;
  requested_project_id?: number | null;
  login_id: string;
  user_name: string;
  email: string;
  phone_number: string;
  department: string | null;
  position: string | null;
  status: number; // 0=승인대기, 1=정상, 2=반려, 3=사용중지
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /user-roles, POST /user-roles, PATCH /user-roles/:user_id/:project_id 응답 항목 */
export interface UserRoleRow {
  user_id: number;
  login_id: string;
  user_name: string;
  project_id: number;
  project_code: string;
  project_name: string;
  role_code: number; // 20=DEVELOPER, 30=APPROVER, 40=OPERATOR
  status: number; // 1=사용, 0=중지
  created_at: string;
  updated_at: string;
}
