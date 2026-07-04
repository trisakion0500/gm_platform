export interface ApiSuccess<T> {
  result: 0;
  data: T;
}

export interface ApiFailure {
  result: number;
  message: string;
}

export interface PaginatedResponse<T> {
  page: number;
  page_size: number;
  total_count: number;
  items: T[];
}

export const ROLE = {
  SUPER_ADMIN: 10,
  DEVELOPER: 20,
  APPROVER: 30,
  OPERATOR: 40,
} as const;

export type RoleCode = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABEL: Record<RoleCode, string> = {
  [ROLE.SUPER_ADMIN]: 'SUPER_ADMIN',
  [ROLE.DEVELOPER]: 'DEVELOPER',
  [ROLE.APPROVER]: 'APPROVER',
  [ROLE.OPERATOR]: 'OPERATOR',
};

export interface CompanyRow {
  company_id: number;
  company_code: string;
  company_name: string;
  description: string | null;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
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

export interface CodeGroupRow {
  code_group_id: number;
  project_id: number;
  code_group_code: string;
  code_group_name: string;
  description: string | null;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface CodeItemRow {
  code_item_id: number;
  code_group_id: number;
  code_value: string;
  code_name: string;
  description: string | null;
  display_order: number;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveCodeItem {
  code_value: string;
  code_name: string;
}

export interface ActiveCodeGroupWithItems {
  code_group_id: number;
  code_group_code: string;
  code_group_name: string;
  items: ActiveCodeItem[];
}

export interface UserRow {
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
  status: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  user_id: number;
  login_id: string;
  user_name: string;
  project_id: number;
  project_code: string;
  project_name: string;
  role_code: number;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface ApiRow {
  api_id: number;
  project_id: number;
  api_code: string;
  api_name: string;
  endpoint: string;
  description: string | null;
  api_stage: number;
  is_required_approval: number;
  response_view_type: number;
  status: number;
  display_order: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
}

export interface ApiRequestRow {
  api_request_id: number;
  api_id: number;
  parameter_name: string;
  parameter_label: string;
  parameter_type: number;
  component_type: number;
  code_group_id: number;
  is_required: number;
  description: string | null;
  display_order: number;
  status: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
}

export interface ApiResponseRow {
  api_response_id: number;
  api_id: number;
  parameter_name: string;
  parameter_label: string;
  parameter_type: number;
  code_group_id: number;
  description: string | null;
  display_order: number;
  status: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
}

export interface ApiDetail {
  api: ApiRow;
  requests: ApiRequestRow[];
  responses: ApiResponseRow[];
}

export interface ApiExecutionRow {
  api_execution_id: number;
  api_id: number;
  api_name: string;
  endpoint: string;
  request_user_id: number;
  approve_user_id: number | null;
  status: number;
  request_json?: Record<string, unknown>;
  response_data?: unknown;
  reject_reason: string | null;
  error_message: string | null;
  requested_at: string;
  approved_at: string | null;
  executed_at: string | null;
  updated_at: string;
}

export interface LogAuditRow {
  log_audit_id: number;
  company_id: number;
  project_id: number | null;
  project_name: string | null;
  table_name: string;
  target_id: string;
  target_name: string;
  action_type: number;
  before_json?: string | null;
  after_json?: string;
  created_by_name: string | null;
  created_at: string;
}
