import axiosInstance, { unwrap } from './axios';
import type { LogAuditSearchResult } from '../types';

export function searchLogAudits(q: string, topK?: number): Promise<LogAuditSearchResult[]> {
  return axiosInstance
    .get('/log-audit-search', { params: { q, top_k: topK } })
    .then(unwrap<LogAuditSearchResult[]>);
}
