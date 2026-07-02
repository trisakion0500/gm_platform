import axiosInstance, { unwrap } from './axios';
import type { RoleCode } from '../types';

// 선택된 프로젝트에서 내 실제 role_code 조회 — 활성 배정이 없으면 null
export function getMyRole(projectId: number): Promise<RoleCode | null> {
  return axiosInstance
    .get('/user-roles/me', { params: { project_id: projectId } })
    .then(unwrap<{ role_code: RoleCode | null }>)
    .then((data) => data.role_code);
}
