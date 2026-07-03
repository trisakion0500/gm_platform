import axiosInstance, { unwrap } from './axios';
import type { CodeItemRow } from '../types';

export function getCodeItemList(codeGroupId: number, status?: number): Promise<CodeItemRow[]> {
  return axiosInstance
    .get('/code-items', { params: { code_group_id: codeGroupId, status } })
    .then(unwrap<{ items: CodeItemRow[] }>)
    .then((res) => res.items);
}

export interface CreateCodeItemPayload {
  code_group_id: number;
  code_value: string;
  code_name: string;
  description?: string;
  display_order: number;
}

export function createCodeItem(payload: CreateCodeItemPayload): Promise<CodeItemRow> {
  return axiosInstance.post('/code-items', payload).then(unwrap<CodeItemRow>);
}

export interface UpdateCodeItemPayload {
  code_name?: string;
  description?: string;
  display_order?: number;
  status?: number;
}

export function updateCodeItem(codeItemId: number, payload: UpdateCodeItemPayload): Promise<CodeItemRow> {
  return axiosInstance.patch(`/code-items/${codeItemId}`, payload).then(unwrap<CodeItemRow>);
}
