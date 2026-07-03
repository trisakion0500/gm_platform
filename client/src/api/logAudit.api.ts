import axiosInstance, { unwrap } from './axios';
import type { LogAuditRow, PaginatedResponse } from '../types';

export interface LogAuditListFilter {
  company_id?: number;
  project_id?: number;
  table_name?: string;
  target_id?: string;
  action_type?: number;
  created_by?: number;
  from_created_at?: string;
  to_created_at?: string;
}

export function getLogAuditList(
  page: number,
  pageSize: number,
  filter: LogAuditListFilter = {},
): Promise<PaginatedResponse<LogAuditRow>> {
  return axiosInstance
    .get('/log-audits', { params: { page, page_size: pageSize, ...filter } })
    .then(unwrap<PaginatedResponse<LogAuditRow>>);
}

export function getLogAudit(logAuditId: number): Promise<LogAuditRow> {
  return axiosInstance.get(`/log-audits/${logAuditId}`).then(unwrap<LogAuditRow>);
}
