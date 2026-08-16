import axiosInstance, { unwrap } from './axios';
import type { LogAuditSearchResult } from '../types';

export function searchLogAudits(
  q: string,
  topK?: number,
  projectId?: number | null,
  companyId?: number | null,
): Promise<LogAuditSearchResult[]> {
  return axiosInstance
    .get('/log-audit-search', { params: { q, top_k: topK, project_id: projectId ?? undefined, company_id: companyId ?? undefined } })
    .then(unwrap<LogAuditSearchResult[]>);
}
