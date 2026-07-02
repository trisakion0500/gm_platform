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
