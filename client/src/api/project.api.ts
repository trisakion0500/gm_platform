import axiosInstance, { unwrap } from './axios';
import type { PaginatedResponse, ProjectRow } from '../types';

// Stage 3에서 등록/수정 함수 추가 예정 — 지금은 Header 드롭다운용 목록 조회만 필요
export function getProjectList(page: number, pageSize: number): Promise<PaginatedResponse<ProjectRow>> {
  return axiosInstance
    .get('/projects', { params: { page, page_size: pageSize } })
    .then(unwrap<PaginatedResponse<ProjectRow>>);
}
