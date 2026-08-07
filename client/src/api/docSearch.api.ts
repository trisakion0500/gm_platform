import axiosInstance, { unwrap } from './axios';
import type { DocSearchResult } from '../types';

export function searchDocs(q: string, topK?: number): Promise<DocSearchResult[]> {
  return axiosInstance
    .get('/doc-search', { params: { q, top_k: topK } })
    .then(unwrap<DocSearchResult[]>);
}
