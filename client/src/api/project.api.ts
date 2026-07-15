import axiosInstance, { unwrap } from './axios';
import type { PaginatedResponse, ProjectRow } from '../types';

export interface ProjectLookupResult {
  project_id: number;
  project_name: string;
}

// 회원가입 화면 전용(인증 불필요) — project_code로 활성 프로젝트 조회
export function getProjectByCode(companyId: number, projectCode: string): Promise<ProjectLookupResult> {
  return axiosInstance
    .get('/projects/lookup', { params: { company_id: companyId, project_code: projectCode } })
    .then(unwrap<ProjectLookupResult>);
}

export function getProjectList(
  page: number,
  pageSize: number,
  companyId?: number,
  status?: number,
): Promise<PaginatedResponse<ProjectRow>> {
  return axiosInstance
    .get('/projects', { params: { page, page_size: pageSize, company_id: companyId, status } })
    .then(unwrap<PaginatedResponse<ProjectRow>>);
}

export function getProject(projectId: number): Promise<ProjectRow> {
  return axiosInstance.get(`/projects/${projectId}`).then(unwrap<ProjectRow>);
}

export interface CreateProjectPayload {
  company_id: number;
  project_code: string;
  project_name: string;
  api_base_url: string;
  description?: string;
}

export function createProject(payload: CreateProjectPayload): Promise<ProjectRow> {
  return axiosInstance.post('/projects', payload).then(unwrap<ProjectRow>);
}

export interface UpdateProjectPayload {
  project_code?: string;
  project_name?: string;
  description?: string;
  status?: number;
}

export function updateProject(projectId: number, payload: UpdateProjectPayload): Promise<ProjectRow> {
  return axiosInstance.patch(`/projects/${projectId}`, payload).then(unwrap<ProjectRow>);
}

// api_base_url(연결 정보)만 수정 — SUPER_ADMIN, DEVELOPER(해당 프로젝트에 실제 역할 보유 시)
export function updateProjectConnection(projectId: number, apiBaseUrl: string): Promise<ProjectRow> {
  return axiosInstance.patch(`/projects/${projectId}/connection`, { api_base_url: apiBaseUrl }).then(unwrap<ProjectRow>);
}

export interface ProjectWithApiKey extends ProjectRow {
  api_key: string;
}

// X-API-Key 발급/재발급 — SUPER_ADMIN, DEVELOPER(해당 프로젝트에 실제 역할 보유 시). 평문 api_key는 이 응답에만 실린다(1회성 노출)
export function issueProjectApiKey(projectId: number): Promise<ProjectWithApiKey> {
  return axiosInstance.post(`/projects/${projectId}/api-key`, {}).then(unwrap<ProjectWithApiKey>);
}
