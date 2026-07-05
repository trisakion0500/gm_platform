import axiosInstance, { unwrap } from './axios';
import type { ApiExecutionRow, PaginatedResponse } from '../types';

export function getApiExecutionList(
  projectId: number,
  page: number,
  pageSize: number,
  apiId?: number,
  requestUserId?: number,
  status?: number,
): Promise<PaginatedResponse<ApiExecutionRow>> {
  return axiosInstance
    .get('/api-executions', {
      params: { project_id: projectId, page, page_size: pageSize, api_id: apiId, request_user_id: requestUserId, status },
    })
    .then(unwrap<PaginatedResponse<ApiExecutionRow>>);
}

export function getApiExecutionPending(projectId: number, page: number, pageSize: number): Promise<PaginatedResponse<ApiExecutionRow>> {
  return axiosInstance
    .get('/api-executions/pending', { params: { project_id: projectId, page, page_size: pageSize } })
    .then(unwrap<PaginatedResponse<ApiExecutionRow>>);
}

export function getApiExecution(apiExecutionId: number): Promise<ApiExecutionRow> {
  return axiosInstance.get(`/api-executions/${apiExecutionId}`).then(unwrap<ApiExecutionRow>);
}

export function approveApiExecution(apiExecutionId: number): Promise<null> {
  return axiosInstance.post(`/api-executions/${apiExecutionId}/approve`).then(unwrap<null>);
}

export function rejectApiExecution(apiExecutionId: number, rejectReason?: string): Promise<null> {
  return axiosInstance.post(`/api-executions/${apiExecutionId}/reject`, { reject_reason: rejectReason }).then(unwrap<null>);
}

export function cancelApiExecution(apiExecutionId: number, rejectReason: string): Promise<null> {
  return axiosInstance.post(`/api-executions/${apiExecutionId}/cancel`, { reject_reason: rejectReason }).then(unwrap<null>);
}
