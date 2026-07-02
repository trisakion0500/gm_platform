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
