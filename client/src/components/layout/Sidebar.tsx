import { useEffect, useState } from 'react';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { Checkbox, Menu, Spin } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import * as apiApi from '../../api/api.api';
import { useApiWorkspaceStore } from '../../stores/apiWorkspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useGlobalStore } from '../../stores/globalStore';
import { ROLE } from '../../types';
import type { ActiveApi, RoleCode } from '../../types';

interface MenuDef {
  key: string;
  label: string;
  allow: RoleCode[];
}

// 13_LAYOUT.md §3.1
// 내 계정은 헤더 우측 아바타 드롭다운에서 이미 접근 가능해 사이드바에는 중복 등록하지 않는다.
// API는 아래 ApiMenuSection이 담당하므로(체크박스 목록으로 확장) 이 배열에는 두지 않는다.
const MAIN_MENU: MenuDef[] = [
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

// api_stage별 실행 가능 역할 — SP_CREATE_API_EXECUTION의 검사와 정확히 동일해야 한다.
// (20:개발 → SUPER_ADMIN/DEVELOPER, 30:스테이징 → +APPROVER, 40:운영 → 전체)
// SP_CREATE_API_EXECUTION이 세션 role_code(가진 프로젝트 중 최고 권한) 대신 user_role을 재조회해
// "선택된 프로젝트에서의 실제 권한"으로 검사하도록 바뀌었으므로, 이 필터도 세션 roleCode가 아니라
// projectRoleCode(GET /user-roles/me 결과)를 기준으로 삼아야 "리스트에 보이는 것 = 실행 가능한 것"이 일치한다.
function canExecuteStage(apiStage: number, projectRoleCode: number | null): boolean {
  if (projectRoleCode === null)
    return false;
  if (apiStage === 20)
    return projectRoleCode === ROLE.SUPER_ADMIN || projectRoleCode === ROLE.DEVELOPER;
  if (apiStage === 30)
    return projectRoleCode === ROLE.SUPER_ADMIN || projectRoleCode === ROLE.DEVELOPER || projectRoleCode === ROLE.APPROVER;
  return true; // 40:운영 — 전체 역할 실행 가능
}

// 사이드바의 "API" 항목 — 펼치면 현재 선택된 프로젝트의 API 목록이 체크박스로 나타난다.
// 체크 시 우측 작업영역(ApiWorkspacePage, /apis)에 해당 API 패널이 열리고, 해제 시 패널이 닫힌다(항상 스토어로 동기화).
// antd Menu 안에 체크박스를 넣으면 Menu 자체의 클릭 핸들링과 충돌하기 쉬워 별도 컴포넌트로 분리했다.
function ApiMenuSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProjectId = useGlobalStore((state) => state.selectedProjectId);
  const projectRoleCode = useGlobalStore((state) => state.projectRoleCode);
  const menuExpanded = useApiWorkspaceStore((state) => state.menuExpanded);
  const setMenuExpanded = useApiWorkspaceStore((state) => state.setMenuExpanded);
  const openApiIds = useApiWorkspaceStore((state) => state.openApiIds);
  const toggleApi = useApiWorkspaceStore((state) => state.toggleApi);
  const [apis, setApis] = useState<ActiveApi[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // projectRoleCode는 프로젝트 전환 시 일단 null로 리셋된 뒤 서버에서 재조회된다(Header.tsx) — null인 동안
    // 요청해도 canExecuteStage가 항상 false라 결과가 전부 걸러지므로, role이 확정될 때까지는 요청 자체를 건너뛴다.
    if (!selectedProjectId || projectRoleCode === null) {
      setApis([]);
      return;
    }
    setLoading(true);
    apiApi
      .getActiveApis(selectedProjectId)
      .then((items) => setApis(items.filter((api) => canExecuteStage(api.api_stage, projectRoleCode))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, projectRoleCode]);

  function handleToggle(apiId: number): void {
    toggleApi(apiId);
    if (location.pathname !== '/apis')
      navigate('/apis');
  }

  const isApisActive = location.pathname === '/apis';

  return (
    <div style={{ borderRight: '1px solid transparent' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 40,
          padding: '0 12px',
          fontWeight: isApisActive ? 600 : 400,
          color: isApisActive ? '#1677ff' : undefined,
          background: isApisActive ? '#e6f4ff' : undefined,
        }}
      >
        {/* 펼치기/접기 전용 버튼 — 항상 보이는 원형 배경으로 "API" 텍스트(이동용)와 클릭 영역을 구분한다.
            호버로만 구분하면 터치 기기에서는 신호가 전혀 안 가기 때문에 상시 표시 방식을 택함. */}
        <span
          onClick={() => setMenuExpanded(!menuExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.06)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {menuExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
        </span>
        <span onClick={() => navigate('/apis')} style={{ cursor: 'pointer', flex: 1, padding: '0 4px' }}>
          API
        </span>
      </div>

      {menuExpanded && (
        <div style={{ padding: '4px 16px 8px 40px' }}>
          {!selectedProjectId && <span style={{ color: '#999' }}>프로젝트를 선택하세요</span>}
          {selectedProjectId && loading && <Spin size="small" />}
          {selectedProjectId && !loading && apis.length === 0 && <span style={{ color: '#999' }}>등록된 API가 없습니다</span>}
          {selectedProjectId &&
            !loading &&
            apis.map((api) => (
              <div key={api.api_id} style={{ padding: '4px 0' }}>
                <Checkbox checked={openApiIds.includes(api.api_id)} onChange={() => handleToggle(api.api_id)}>
                  {api.api_name}
                </Checkbox>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

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
    <div style={{ height: '100%' }}>
      {variant === 'main' && <ApiMenuSection />}
      <Menu
        mode="inline"
        items={items}
        selectedKeys={selectedKey ? [selectedKey] : []}
        onClick={({ key }) => navigate(key)}
        style={{ borderRight: 0 }}
      />
    </div>
  );
}

export default Sidebar;
