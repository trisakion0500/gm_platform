import axiosInstance, { unwrap } from './axios';
import type { ApiExecutionRow, PaginatedResponse } from '../types';

export function getApiExecutionList(
  apiId: number,
  page: number,
  pageSize: number,
  status?: number,
): Promise<PaginatedResponse<ApiExecutionRow>> {
  return axiosInstance
    .get('/api-executions', { params: { api_id: apiId, page, page_size: pageSize, status } })
    .then(unwrap<PaginatedResponse<ApiExecutionRow>>);
}

export function getApiExecutionPending(apiId: number, page: number, pageSize: number): Promise<PaginatedResponse<ApiExecutionRow>> {
  return axiosInstance
    .get('/api-executions/pending', { params: { api_id: apiId, page, page_size: pageSize } })
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
