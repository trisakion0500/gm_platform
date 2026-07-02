import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoleCode } from '../types';

// /auth/me는 user 테이블 원본 컬럼만 반환 — role_code는 user_role 조인으로만 계산되는 값이라 여기 없음
export interface AuthUser {
  user_id: number;
  company_id: number;
  requested_project_id: number | null;
  login_id: string;
  user_name: string;
  email: string;
  status: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  roleCode: RoleCode | null;
  user: AuthUser | null;
  setTokens: (accessToken: string, roleCode: RoleCode, refreshToken?: string) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      roleCode: null,
      user: null,
      setTokens: (accessToken, roleCode, refreshToken) =>
        set((state) => ({
          accessToken,
          roleCode,
          refreshToken: refreshToken ?? state.refreshToken,
        })),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, roleCode: null, user: null }),
    }),
    {
      // user는 role_code/status가 서버에서 바뀔 수 있으므로 저장하지 않고 부팅 시 /auth/me로 재조회
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        roleCode: state.roleCode,
      }),
    },
  ),
);
