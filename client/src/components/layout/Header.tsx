import { useEffect } from 'react';
import { Avatar, Button, Dropdown, Layout, Select, Space, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import * as companyApi from '../../api/company.api';
import * as projectApi from '../../api/project.api';
import * as userRoleApi from '../../api/userRole.api';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { useGlobalStore } from '../../stores/globalStore';
import { useApiWorkspaceStore } from '../../stores/apiWorkspaceStore';
import { ROLE, ROLE_LABEL } from '../../types';

const { Header: AntHeader } = Layout;

// 관리 메뉴의 "목록" 화면 — 이 경로들에서만 헤더의 회사/프로젝트 선택 변경을 허용한다.
// 그 외 관리 화면(등록/상세/수정, code-groups 편집 그리드)은 작업 도중 컨텍스트가
// 바뀌는 걸 막기 위해 잠근다. 관리 메뉴가 아닌 화면(/apis, /executions 등)은 대상 아님.
const ADMIN_LIST_PATHS = ['/admin/companies', '/admin/projects', '/admin/users', '/admin/apis', '/admin/audit-logs'];

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roleCode, logout } = useAuth();
  const canManage = usePermission([ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER]);
  const isSuperAdmin = roleCode === ROLE.SUPER_ADMIN;
  const isAdminNonListPage = location.pathname.startsWith('/admin') && !ADMIN_LIST_PATHS.includes(location.pathname);

  const companyList = useGlobalStore((state) => state.companyList);
  const projectList = useGlobalStore((state) => state.projectList);
  const selectedCompanyId = useGlobalStore((state) => state.selectedCompanyId);
  const selectedProjectId = useGlobalStore((state) => state.selectedProjectId);
  const setCompanyList = useGlobalStore((state) => state.setCompanyList);
  const setProjectList = useGlobalStore((state) => state.setProjectList);
  const selectCompany = useGlobalStore((state) => state.selectCompany);
  const selectProject = useGlobalStore((state) => state.selectProject);
  const setProjectRoleCode = useGlobalStore((state) => state.setProjectRoleCode);
  const projectRoleCode = useGlobalStore((state) => state.projectRoleCode);
  const resetApiWorkspace = useApiWorkspaceStore((state) => state.reset);

  // 회사/프로젝트 목록은 로그인 상태에서 1회 로드 — 역할별 스코핑은 서버가 이미 처리(SA: 전체, 그 외: 보유분만)
  useEffect(() => {
    companyApi.getCompanyList(1, 100).then(({ items }) => {
      setCompanyList(items);
      if (items.length > 0)
        selectCompany(items[0].company_id);
    });
    projectApi.getProjectList(1, 100).then(({ items }) => setProjectList(items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // selectedCompanyId === null → SUPER_ADMIN이 "전체 회사"를 선택한 상태 (전체 프로젝트 대상)
  const projectsForCompany = selectedCompanyId === null ? projectList : projectList.filter((p) => p.company_id === selectedCompanyId);

  // 회사 선택이 바뀌거나 목록이 로드되면, 선택된 프로젝트가 그 회사 소속이 아닐 경우 첫 항목으로 보정
  // SUPER_ADMIN은 "전체 프로젝트"(null)를 명시적으로 선택할 수 있어야 하므로 강제 보정 대상에서 제외
  useEffect(() => {
    if (isSuperAdmin)
      return;
    if (projectsForCompany.length === 0)
      return;
    if (!projectsForCompany.some((p) => p.project_id === selectedProjectId))
      selectProject(projectsForCompany[0].project_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, projectList, isSuperAdmin]);

  // 선택된 프로젝트가 바뀔 때마다 그 프로젝트에서 내 실제 role_code를 서버에서 다시 조회
  useEffect(() => {
    if (!selectedProjectId)
      return;
    userRoleApi.getMyRole(selectedProjectId).then(setProjectRoleCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // 프로젝트가 바뀌면 이전 프로젝트의 API 작업영역(열어둔 패널·입력값)은 더 이상 의미가 없으므로 초기화
  useEffect(() => {
    resetApiWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const userMenuItems = [
    { key: 'my-account', label: '내 계정' },
    { key: 'logout', label: '로그아웃' },
  ];

  function handleUserMenuClick({ key }: { key: string }): void {
    if (key === 'my-account')
      navigate('/my-account');
    if (key === 'logout')
      logout();
  }

  return (
    <AntHeader style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
      <Typography.Link onClick={() => navigate('/apis')} strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
        {import.meta.env.VITE_APP_NAME}
      </Typography.Link>

      <Select
        style={{ width: 160 }}
        value={selectedCompanyId ?? (isSuperAdmin ? 'ALL' : undefined)}
        disabled={!isSuperAdmin || isAdminNonListPage}
        options={[
          ...(isSuperAdmin ? [{ value: 'ALL', label: '전체 회사' }] : []),
          ...companyList.map((c) => ({ value: c.company_id, label: c.company_name })),
        ]}
        onChange={(value) => selectCompany(value === 'ALL' ? null : (value as number))}
      />

      <Select
        style={{ width: 200 }}
        value={selectedProjectId ?? (isSuperAdmin ? 'ALL' : undefined)}
        disabled={isAdminNonListPage}
        options={[
          ...(isSuperAdmin ? [{ value: 'ALL', label: '전체 프로젝트' }] : []),
          ...projectsForCompany.map((p) => ({ value: p.project_id, label: p.project_name })),
        ]}
        onChange={(value) => selectProject(value === 'ALL' ? null : (value as number))}
      />

      <div style={{ flex: 1 }} />

      {canManage && <Button onClick={() => navigate('/admin')}>관리</Button>}

      <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }}>
        <Space style={{ cursor: 'pointer' }}>
          <Avatar size="small" icon={<UserOutlined />} />
          {projectRoleCode !== null && `[${ROLE_LABEL[projectRoleCode]}]`}
          {user?.user_name}
        </Space>
      </Dropdown>
    </AntHeader>
  );
}

export default Header;
