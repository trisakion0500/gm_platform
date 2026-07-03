import axiosInstance, { unwrap } from './axios';
import type { RoleCode, UserRoleRow } from '../types';

// 선택된 프로젝트에서 내 실제 role_code 조회 — 활성 배정이 없으면 null
export function getMyRole(projectId: number): Promise<RoleCode | null> {
  return axiosInstance
    .get('/user-roles/me', { params: { project_id: projectId } })
    .then(unwrap<{ role_code: RoleCode | null }>)
    .then((data) => data.role_code);
}

export interface UserRoleListFilter {
  user_id?: number;
  project_id?: number;
  role_code?: number;
  status?: number;
}

export function getUserRoleList(filter: UserRoleListFilter): Promise<UserRoleRow[]> {
  return axiosInstance.get('/user-roles', { params: filter }).then(unwrap<UserRoleRow[]>);
}

export interface CreateUserRolePayload {
  user_id: number;
  project_id: number;
  role_code: number;
}

export function createUserRole(payload: CreateUserRolePayload): Promise<UserRoleRow> {
  return axiosInstance.post('/user-roles', payload).then(unwrap<UserRoleRow>);
}

export interface UpdateUserRolePayload {
  role_code?: number;
  status?: number;
}

export function updateUserRole(userId: number, projectId: number, payload: UpdateUserRolePayload): Promise<UserRoleRow> {
  return axiosInstance.patch(`/user-roles/${userId}/${projectId}`, payload).then(unwrap<UserRoleRow>);
}
