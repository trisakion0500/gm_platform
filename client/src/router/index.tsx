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
            <Route path="/apis" element={<PagePlaceholder title="API 목록" />} />
            <Route path="/apis/new" element={<PagePlaceholder title="API 등록" />} />
            <Route path="/apis/:api_id" element={<PagePlaceholder title="API 상세" />} />
            <Route path="/executions" element={<PagePlaceholder title="실행이력" />} />
            <Route path="/executions/pending" element={<PagePlaceholder title="승인대기" />} />
            <Route path="/executions/:api_execution_id" element={<PagePlaceholder title="실행이력 상세" />} />
            <Route path="/code-groups" element={<PagePlaceholder title="코드그룹" />} />
            <Route path="/code-groups/:code_group_id" element={<PagePlaceholder title="코드그룹 상세" />} />
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
                <Route path="projects" element={<PagePlaceholder title="프로젝트 목록" />} />
                <Route path="projects/new" element={<PagePlaceholder title="프로젝트 등록" />} />
                <Route path="projects/:project_id" element={<PagePlaceholder title="프로젝트 상세" />} />
                <Route path="users" element={<PagePlaceholder title="사용자 목록" />} />
                <Route path="users/:user_id" element={<PagePlaceholder title="사용자 상세" />} />
              </Route>

              <Route path="audit-logs" element={<PagePlaceholder title="감사로그" />} />
              <Route path="audit-logs/:log_audit_id" element={<PagePlaceholder title="감사로그 상세" />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
