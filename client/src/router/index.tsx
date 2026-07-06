import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import AuthGuard from './AuthGuard';
import GuestGuard from './GuestGuard';
import RoleGuard from './RoleGuard';
import AuthLayout from '../components/layout/AuthLayout';
import MainLayout from '../components/layout/MainLayout';
import AdminLayout from '../components/layout/AdminLayout';
import { useAuthStore } from '../stores/authStore';
import { ROLE } from '../types';

// 라우트 단위 코드 스플리팅 — 레이아웃/가드는 항상 필요하므로 eager 유지, 페이지 컴포넌트만 lazy
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const SignupPage = lazy(() => import('../pages/auth/SignupPage'));
const CompanyListPage = lazy(() => import('../pages/admin/companies/CompanyListPage'));
const CompanyNewPage = lazy(() => import('../pages/admin/companies/CompanyNewPage'));
const CompanyDetailPage = lazy(() => import('../pages/admin/companies/CompanyDetailPage'));
const ProjectListPage = lazy(() => import('../pages/admin/projects/ProjectListPage'));
const ProjectNewPage = lazy(() => import('../pages/admin/projects/ProjectNewPage'));
const ProjectDetailPage = lazy(() => import('../pages/admin/projects/ProjectDetailPage'));
const UserListPage = lazy(() => import('../pages/admin/users/UserListPage'));
const UserDetailPage = lazy(() => import('../pages/admin/users/UserDetailPage'));
const AuditLogListPage = lazy(() => import('../pages/admin/audit-logs/AuditLogListPage'));
const AuditLogDetailPage = lazy(() => import('../pages/admin/audit-logs/AuditLogDetailPage'));
const CodeGroupPage = lazy(() => import('../pages/admin/code-groups/CodeGroupPage'));
const ApiListPage = lazy(() => import('../pages/admin/apis/ApiListPage'));
const ApiNewPage = lazy(() => import('../pages/admin/apis/ApiNewPage'));
const ApiDetailPage = lazy(() => import('../pages/admin/apis/ApiDetailPage'));
const ApiWorkspacePage = lazy(() => import('../pages/main/apis/ApiWorkspacePage'));
const ExecutionListPage = lazy(() => import('../pages/main/executions/ExecutionListPage'));
const ExecutionDetailPage = lazy(() => import('../pages/main/executions/ExecutionDetailPage'));
const ExecutionPendingListPage = lazy(() => import('../pages/main/executions/ExecutionPendingListPage'));
const ExecutionPendingDetailPage = lazy(() => import('../pages/main/executions/ExecutionPendingDetailPage'));
const MyAccountPage = lazy(() => import('../pages/main/my-account/MyAccountPage'));
const ForbiddenPage = lazy(() => import('../pages/errors/ForbiddenPage'));
const NotFoundPage = lazy(() => import('../pages/errors/NotFoundPage'));

// /admin 진입 시 역할별 첫 메뉴로 리다이렉트 (13_LAYOUT.md §4.1) — APPROVER는 감사로그만 접근 가능
function AdminIndexRedirect() {
  const roleCode = useAuthStore((state) => state.roleCode);
  const target = roleCode === ROLE.APPROVER ? '/admin/audit-logs' : '/admin/companies';
  return <Navigate to={target} replace />;
}

// 라우트 전환 시 청크 로딩 동안 보여줄 전체 화면 스피너
function RouteFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" />
    </div>
  );
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<GuestGuard />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
          </Route>

          <Route element={<AuthGuard />}>
            <Route path="/" element={<Navigate to="/apis" replace />} />
            <Route path="/403" element={<ForbiddenPage />} />

            <Route element={<MainLayout />}>
              <Route path="/apis" element={<ApiWorkspacePage />} />
              <Route path="/executions" element={<ExecutionListPage />} />
              <Route element={<RoleGuard allow={[ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER]} />}>
                <Route path="/executions/pending" element={<ExecutionPendingListPage />} />
                <Route path="/executions/pending/:api_execution_id" element={<ExecutionPendingDetailPage />} />
              </Route>
              <Route path="/executions/:api_execution_id" element={<ExecutionDetailPage />} />
              <Route path="/my-account" element={<MyAccountPage />} />
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
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRouter;
