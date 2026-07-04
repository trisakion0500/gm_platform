import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthGuard from './AuthGuard';
import GuestGuard from './GuestGuard';
import RoleGuard from './RoleGuard';
import AuthLayout from '../components/layout/AuthLayout';
import MainLayout from '../components/layout/MainLayout';
import AdminLayout from '../components/layout/AdminLayout';
import LoginPage from '../pages/auth/LoginPage';
import CompanyListPage from '../pages/admin/companies/CompanyListPage';
import CompanyNewPage from '../pages/admin/companies/CompanyNewPage';
import CompanyDetailPage from '../pages/admin/companies/CompanyDetailPage';
import ProjectListPage from '../pages/admin/projects/ProjectListPage';
import ProjectNewPage from '../pages/admin/projects/ProjectNewPage';
import ProjectDetailPage from '../pages/admin/projects/ProjectDetailPage';
import UserListPage from '../pages/admin/users/UserListPage';
import UserDetailPage from '../pages/admin/users/UserDetailPage';
import AuditLogListPage from '../pages/admin/audit-logs/AuditLogListPage';
import AuditLogDetailPage from '../pages/admin/audit-logs/AuditLogDetailPage';
import CodeGroupPage from '../pages/admin/code-groups/CodeGroupPage';
import ApiListPage from '../pages/admin/apis/ApiListPage';
import ApiNewPage from '../pages/admin/apis/ApiNewPage';
import ApiDetailPage from '../pages/admin/apis/ApiDetailPage';
import ApiWorkspacePage from '../pages/main/apis/ApiWorkspacePage';
import PagePlaceholder from '../pages/PagePlaceholder';
import ForbiddenPage from '../pages/errors/ForbiddenPage';
import NotFoundPage from '../pages/errors/NotFoundPage';
import { useAuthStore } from '../stores/authStore';
import { ROLE } from '../types';

// /admin 진입 시 역할별 첫 메뉴로 리다이렉트 (13_LAYOUT.md §4.1) — APPROVER는 감사로그만 접근 가능
function AdminIndexRedirect() {
  const roleCode = useAuthStore((state) => state.roleCode);
  const target = roleCode === ROLE.APPROVER ? '/admin/audit-logs' : '/admin/companies';
  return <Navigate to={target} replace />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestGuard />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<PagePlaceholder title="회원가입" />} />
          </Route>
        </Route>

        <Route element={<AuthGuard />}>
          <Route path="/" element={<Navigate to="/apis" replace />} />
          <Route path="/403" element={<ForbiddenPage />} />

          <Route element={<MainLayout />}>
            <Route path="/apis" element={<ApiWorkspacePage />} />
            <Route path="/executions" element={<PagePlaceholder title="실행이력" />} />
            <Route path="/executions/pending" element={<PagePlaceholder title="승인대기" />} />
            <Route path="/executions/:api_execution_id" element={<PagePlaceholder title="실행이력 상세" />} />
            <Route path="/my-account" element={<PagePlaceholder title="내 계정" />} />
          </Route>

          <Route path="/admin" element={<RoleGuard allow={[ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER]} />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminIndexRedirect />} />

              <Route element={<RoleGuard allow={[ROLE.SUPER_ADMIN, ROLE.DEVELOPER]} />}>
                <Route path="companies" element={<CompanyListPage />} />
                <Route element={<RoleGuard allow={[ROLE.SUPER_ADMIN]} />}>
                  <Route path="companies/new" element={<CompanyNewPage />} />
                </Route>
                <Route path="companies/:company_id" element={<CompanyDetailPage />} />
                <Route path="projects" element={<ProjectListPage />} />
                <Route element={<RoleGuard allow={[ROLE.SUPER_ADMIN]} />}>
                  <Route path="projects/new" element={<ProjectNewPage />} />
                </Route>
                <Route path="projects/:project_id" element={<ProjectDetailPage />} />
                <Route path="users" element={<UserListPage />} />
                <Route path="users/:user_id" element={<UserDetailPage />} />
                <Route path="code-groups" element={<CodeGroupPage />} />
                <Route path="apis" element={<ApiListPage />} />
                <Route path="apis/new" element={<ApiNewPage />} />
                <Route path="apis/:api_id" element={<ApiDetailPage />} />
              </Route>

              <Route path="audit-logs" element={<AuditLogListPage />} />
              <Route path="audit-logs/:log_audit_id" element={<AuditLogDetailPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
