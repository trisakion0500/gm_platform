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

/** GET /projects 항목 — 로그인 계정이 실제 user_role을 가진 프로젝트만 반환(SUPER_ADMIN은 전체) */
export interface Project {
  project_id: number;
  company_id: number;
  company_code: string;
  company_name: string;
  project_code: string;
  project_name: string;
  api_base_url: string;
  description: string | null;
  status: number;
  created_at: string;
  updated_at: string;
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
