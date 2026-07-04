import { Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ROLE } from '../../types';
import type { RoleCode } from '../../types';

interface MenuDef {
  key: string;
  label: string;
  allow: RoleCode[];
}

// 13_LAYOUT.md §3.1
// 내 계정은 헤더 우측 아바타 드롭다운에서 이미 접근 가능해 사이드바에는 중복 등록하지 않는다.
const MAIN_MENU: MenuDef[] = [
  { key: '/apis', label: 'API', allow: [ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR] },
  { key: '/executions', label: '실행이력', allow: [ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR] },
  { key: '/executions/pending', label: '승인대기', allow: [ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER] },
];

// 13_LAYOUT.md §4.1
// 코드그룹은 편집이 SUPER_ADMIN/DEVELOPER 전용이라 관리 메뉴에 둔다.
// APPROVER/OPERATOR의 코드값 참조는 이 화면이 아니라 GET /code-groups/active-with-items로 API 상세/실행 화면에서 처리한다.
const ADMIN_MENU: MenuDef[] = [
  { key: '/admin/companies', label: '회사', allow: [ROLE.SUPER_ADMIN, ROLE.DEVELOPER] },
  { key: '/admin/projects', label: '프로젝트', allow: [ROLE.SUPER_ADMIN, ROLE.DEVELOPER] },
  { key: '/admin/users', label: '사용자', allow: [ROLE.SUPER_ADMIN, ROLE.DEVELOPER] },
  { key: '/admin/code-groups', label: '코드그룹', allow: [ROLE.SUPER_ADMIN, ROLE.DEVELOPER] },
  { key: '/admin/apis', label: 'API', allow: [ROLE.SUPER_ADMIN, ROLE.DEVELOPER] },
  { key: '/admin/audit-logs', label: '감사로그', allow: [ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER] },
];

interface SidebarProps {
  variant: 'main' | 'admin';
}

function Sidebar({ variant }: SidebarProps) {
  const roleCode = useAuthStore((state) => state.roleCode);
  const navigate = useNavigate();
  const location = useLocation();
  const menu = variant === 'main' ? MAIN_MENU : ADMIN_MENU;

  const items = menu
    .filter((item) => roleCode !== null && item.allow.includes(roleCode))
    .map((item) => ({ key: item.key, label: item.label }));

  // 가장 긴(가장 구체적인) 경로 매치를 선택 상태로 표시 — /executions/pending이 /executions보다 우선
  const selectedKey = menu
    .filter((item) => location.pathname === item.key || location.pathname.startsWith(`${item.key}/`))
    .sort((a, b) => b.key.length - a.key.length)[0]?.key;

  return (
    <Menu
      mode="inline"
      items={items}
      selectedKeys={selectedKey ? [selectedKey] : []}
      onClick={({ key }) => navigate(key)}
      style={{ height: '100%', borderRight: 0 }}
    />
  );
}

export default Sidebar;
