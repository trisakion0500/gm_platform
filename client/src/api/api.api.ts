import axiosInstance, { unwrap } from './axios';
import type { ActiveApi, ApiDetail, ApiExecutionRow, ApiRequestRow, ApiResponseRow, ApiRow, PaginatedResponse } from '../types';

// 사이드바 API 메뉴용 활성 API 전체 조회 (페이지네이션 없음)
export function getActiveApis(projectId: number): Promise<ActiveApi[]> {
  return axiosInstance.get('/apis/active', { params: { project_id: projectId } }).then(unwrap<ActiveApi[]>);
}

export function getApiList(
  page: number,
  pageSize: number,
  projectId: number,
  status?: number,
  apiStage?: number,
): Promise<PaginatedResponse<ApiRow>> {
  return axiosInstance
    .get('/apis', { params: { project_id: projectId, page, page_size: pageSize, status, api_stage: apiStage } })
    .then(unwrap<PaginatedResponse<ApiRow>>);
}

export function getApi(apiId: number): Promise<ApiDetail> {
  return axiosInstance.get(`/apis/${apiId}`).then(unwrap<ApiDetail>);
}

export interface CreateApiPayload {
  project_id: number;
  api_code: string;
  api_name: string;
  endpoint: string;
  description?: string;
  is_required_approval: number;
  response_view_type: number;
  display_order?: number;
}

export function createApi(payload: CreateApiPayload): Promise<ApiRow> {
  return axiosInstance.post('/apis', payload).then(unwrap<ApiRow>);
}

export interface UpdateApiPayload {
  api_code?: string;
  api_name?: string;
  endpoint?: string;
  description?: string;
  api_stage?: number;
  is_required_approval?: number;
  response_view_type?: number;
  display_order?: number;
  status?: number;
}

export function updateApi(apiId: number, payload: UpdateApiPayload): Promise<ApiRow> {
  return axiosInstance.patch(`/apis/${apiId}`, payload).then(unwrap<ApiRow>);
}

export interface CreateApiRequestPayload {
  parameter_name: string;
  parameter_label: string;
  parameter_type: number;
  component_type: number;
  code_group_id: number;
  is_required: number;
  description?: string;
  display_order: number;
}

export function createApiRequest(apiId: number, payload: CreateApiRequestPayload): Promise<ApiRequestRow> {
  return axiosInstance.post(`/apis/${apiId}/requests`, payload).then(unwrap<ApiRequestRow>);
}

export interface CreateApiResponsePayload {
  parameter_name: string;
  parameter_label: string;
  parameter_type: number;
  code_group_id: number;
  description?: string;
  display_order: number;
}

export function createApiResponse(apiId: number, payload: CreateApiResponsePayload): Promise<ApiResponseRow> {
  return axiosInstance.post(`/apis/${apiId}/responses`, payload).then(unwrap<ApiResponseRow>);
}

export function executeApi(apiId: number, requestJson: Record<string, unknown>): Promise<ApiExecutionRow> {
  return axiosInstance.post(`/apis/${apiId}/execute`, { request_json: requestJson }).then(unwrap<ApiExecutionRow>);
}
