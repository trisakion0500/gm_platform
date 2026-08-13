import axiosInstance, { unwrap } from './axios';
import type { ApiSearchResult } from '../types';

export function searchApis(q: string, topK?: number): Promise<ApiSearchResult[]> {
  return axiosInstance
    .get('/api-search', { params: { q, top_k: topK } })
    .then(unwrap<ApiSearchResult[]>);
}
