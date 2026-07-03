import axiosInstance, { unwrap } from './axios';
import type { PaginatedResponse, ProjectRow } from '../types';

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
  api_base_url?: string;
  description?: string;
  status?: number;
}

export function updateProject(projectId: number, payload: UpdateProjectPayload): Promise<ProjectRow> {
  return axiosInstance.patch(`/projects/${projectId}`, payload).then(unwrap<ProjectRow>);
}
