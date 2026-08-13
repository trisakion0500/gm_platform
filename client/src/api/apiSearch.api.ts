import axiosInstance, { unwrap } from './axios';
import type { ApiSearchResult } from '../types';

export function searchApis(q: string, projectId: number, topK?: number): Promise<ApiSearchResult[]> {
  return axiosInstance
    .get('/api-search', { params: { q, project_id: projectId, top_k: topK } })
    .then(unwrap<ApiSearchResult[]>);
}
