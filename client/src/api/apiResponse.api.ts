import axiosInstance, { unwrap } from './axios';
import type { ApiResponseRow } from '../types';

export function getApiResponse(apiResponseId: number): Promise<ApiResponseRow> {
  return axiosInstance.get(`/api-responses/${apiResponseId}`).then(unwrap<ApiResponseRow>);
}

export interface UpdateApiResponsePayload {
  parameter_label?: string;
  parameter_type?: number;
  code_group_id?: number;
  description?: string;
  display_order?: number;
  status?: number;
}

export function updateApiResponse(apiResponseId: number, payload: UpdateApiResponsePayload): Promise<ApiResponseRow> {
  return axiosInstance.patch(`/api-responses/${apiResponseId}`, payload).then(unwrap<ApiResponseRow>);
}
