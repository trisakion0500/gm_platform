import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import * as authApi from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import { useGlobalStore } from '../stores/globalStore';
import { useListFilterStore } from '../stores/listFilterStore';
import { useApiWorkspaceStore } from '../stores/apiWorkspaceStore';

// 새로고침 시 accessToken은 localStorage에 남아있지만 user는 저장하지 않으므로 /auth/me로 복원한다
export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const roleCode = useAuthStore((state) => state.roleCode);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clear = useAuthStore((state) => state.clear);
  const resetGlobal = useGlobalStore((state) => state.reset);
  const resetListFilter = useListFilterStore((state) => state.reset);
  const resetApiWorkspace = useApiWorkspaceStore((state) => state.reset);
  const [loading, setLoading] = useState(!!accessToken && !user);

  useEffect(() => {
    if (!accessToken || user) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch((err: unknown) => {
        // 서버가 실제로 인증 실패를 응답한 경우만 세션 종료. 네트워크 오류(백엔드 다운 등)는 토큰을 유지해
        // 재접속 시 재로그인 없이 복구되도록 한다 — 응답 자체가 없으면(err.response undefined) 무조건
        // 로그아웃시키던 이전 로직이 백엔드 다운을 세션 만료로 오인해 유효한 토큰을 지워버리는 문제가 있었다.
        if (isAxiosError(err) && err.response)
          clear();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      clear();
      resetGlobal();
      resetListFilter();
      resetApiWorkspace();
    }
  }

  return {
    user,
    roleCode,
    isAuthenticated: !!accessToken,
    loading,
    logout,
  };
}
