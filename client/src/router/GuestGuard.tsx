import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

// 이미 인증된 상태로 /login, /signup 접근 시 /apis로 리다이렉트
function GuestGuard() {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (accessToken)
    return <Navigate to="/apis" replace />;

  return <Outlet />;
}

export default GuestGuard;
