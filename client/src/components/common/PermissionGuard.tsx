import type { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';
import type { RoleCode } from '../../types';

interface PermissionGuardProps {
  allow: RoleCode[];
  children: ReactNode;
}

// roleCode가 allow에 없으면 children을 아예 렌더링하지 않는다 (버튼/메뉴 노출 제어용)
function PermissionGuard({ allow, children }: PermissionGuardProps) {
  const hasPermission = usePermission(allow);

  if (!hasPermission)
    return null;

  return <>{children}</>;
}

export default PermissionGuard;
