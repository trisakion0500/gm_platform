import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

// accessToken 없이 인증 필요 라우트 접근 시 /login으로 차단
function AuthGuard() {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!accessToken)
    return <Navigate to="/login" replace />;

  return <Outlet />;
}

export default AuthGuard;
