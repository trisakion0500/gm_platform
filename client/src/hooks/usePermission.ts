import { useAuthStore } from '../stores/authStore';
import type { RoleCode } from '../types';

// 로그인 roleCode(최고 권한) 기준 메뉴/버튼 노출 여부 판단 — 프로젝트별 실제 권한은 globalStore.projectRoleCode 사용
export function usePermission(allow: RoleCode[]): boolean {
  const roleCode = useAuthStore((state) => state.roleCode);
  return roleCode !== null && allow.includes(roleCode);
}
