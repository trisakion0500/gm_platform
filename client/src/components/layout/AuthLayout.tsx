import { Outlet } from 'react-router-dom';

// 사이드바/헤더/푸터 없음 — 각 페이지가 자체적으로 중앙 정렬
function AuthLayout() {
  return <Outlet />;
}

export default AuthLayout;
