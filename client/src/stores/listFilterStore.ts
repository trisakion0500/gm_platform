import { create } from 'zustand';

interface ListFilterState {
  companyListStatus: number | undefined;
  setCompanyListStatus: (status: number | undefined) => void;

  projectListStatus: number | undefined;
  setProjectListStatus: (status: number | undefined) => void;

  userListStatus: number | undefined;
  setUserListStatus: (status: number | undefined) => void;

  reset: () => void;
}

// 목록 화면 검색조건 — 등록/상세 화면 이동 후 목록으로 돌아와도 유지되도록 컴포넌트 local state 대신 스토어에 보관
// 회사 필터는 헤더의 전역 회사 선택(globalStore.selectedCompanyId)을 그대로 사용하므로 여기서는 상태(status) 필터만 관리
export const useListFilterStore = create<ListFilterState>()((set) => ({
  companyListStatus: undefined,
  setCompanyListStatus: (companyListStatus) => set({ companyListStatus }),

  projectListStatus: undefined,
  setProjectListStatus: (projectListStatus) => set({ projectListStatus }),

  userListStatus: undefined,
  setUserListStatus: (userListStatus) => set({ userListStatus }),

  // 로그아웃 시 다른 계정의 필터가 남지 않도록 초기화 (useAuth.ts logout()에서 호출)
  reset: () =>
    set({
      companyListStatus: undefined,
      projectListStatus: undefined,
      userListStatus: undefined,
    }),
}));
