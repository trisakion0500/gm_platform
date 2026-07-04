import { useEffect, useState } from 'react';
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
      .catch(() => clear())
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
