import axiosInstance, { unwrap } from './axios';
import type { ApiRequestRow } from '../types';

export function getApiRequest(apiRequestId: number): Promise<ApiRequestRow> {
  return axiosInstance.get(`/api-requests/${apiRequestId}`).then(unwrap<ApiRequestRow>);
}

export interface UpdateApiRequestPayload {
  parameter_label?: string;
  parameter_type?: number;
  component_type?: number;
  code_group_id?: number;
  is_required?: number;
  description?: string;
  display_order?: number;
  status?: number;
}

export function updateApiRequest(apiRequestId: number, payload: UpdateApiRequestPayload): Promise<ApiRequestRow> {
  return axiosInstance.patch(`/api-requests/${apiRequestId}`, payload).then(unwrap<ApiRequestRow>);
}
