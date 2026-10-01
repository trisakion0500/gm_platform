import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_SIDEBAR_WIDTH = 200;

interface UiState {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}

// 로그인 계정과 무관한 순수 레이아웃 취향이라 logout() 시 reset 대상에 포함하지 않는다.
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
    }),
    { name: 'ui-storage' },
  ),
);
