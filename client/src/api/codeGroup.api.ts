import axiosInstance, { unwrap } from './axios';
import type { ActiveCodeGroupWithItems, CodeGroupRow } from '../types';

export function getCodeGroupList(projectId: number, status?: number): Promise<CodeGroupRow[]> {
  return axiosInstance
    .get('/code-groups', { params: { project_id: projectId, status } })
    .then(unwrap<{ items: CodeGroupRow[] }>)
    .then((res) => res.items);
}

// APPROVER/OPERATOR는 /admin/code-groups(SUPER_ADMIN/DEVELOPER 전용)에 접근할 수 없으므로,
// API Request/Response의 SELECT/RADIO/CHECKBOX 값 참조용으로 이 엔드포인트를 대신 사용한다.
export function getActiveCodeGroupsWithItems(projectId: number): Promise<ActiveCodeGroupWithItems[]> {
  return axiosInstance
    .get('/code-groups/active-with-items', { params: { project_id: projectId } })
    .then(unwrap<{ items: ActiveCodeGroupWithItems[] }>)
    .then((res) => res.items);
}

export interface CreateCodeGroupPayload {
  project_id: number;
  code_group_code: string;
  code_group_name: string;
  description?: string;
}

export function createCodeGroup(payload: CreateCodeGroupPayload): Promise<CodeGroupRow> {
  return axiosInstance.post('/code-groups', payload).then(unwrap<CodeGroupRow>);
}

export interface UpdateCodeGroupPayload {
  code_group_name?: string;
  description?: string;
  status?: number;
}

export function updateCodeGroup(codeGroupId: number, payload: UpdateCodeGroupPayload): Promise<CodeGroupRow> {
  return axiosInstance.patch(`/code-groups/${codeGroupId}`, payload).then(unwrap<CodeGroupRow>);
}
