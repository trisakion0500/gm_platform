import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { RoleCode } from '../types';

interface RoleGuardProps {
  allow: RoleCode[];
}

// roleCode가 allow 목록에 없으면 /403으로 차단. AuthGuard 하위에서만 사용 — accessToken 존재는 이미 보장됨
function RoleGuard({ allow }: RoleGuardProps) {
  const roleCode = useAuthStore((state) => state.roleCode);

  if (roleCode === null || !allow.includes(roleCode))
    return <Navigate to="/403" replace />;

  return <Outlet />;
}

export default RoleGuard;
