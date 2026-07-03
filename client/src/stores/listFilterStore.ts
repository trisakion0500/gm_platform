import { create } from 'zustand';

interface ListFilterState {
  companyListStatus: number | undefined;
  setCompanyListStatus: (status: number | undefined) => void;

  projectListCompanyId: number | undefined;
  projectListStatus: number | undefined;
  setProjectListFilter: (companyId: number | undefined, status: number | undefined) => void;

  userListCompanyId: number | undefined;
  userListStatus: number | undefined;
  setUserListFilter: (companyId: number | undefined, status: number | undefined) => void;

  reset: () => void;
}

// 목록 화면 검색조건 — 등록/상세 화면 이동 후 목록으로 돌아와도 유지되도록 컴포넌트 local state 대신 스토어에 보관
export const useListFilterStore = create<ListFilterState>()((set) => ({
  companyListStatus: undefined,
  setCompanyListStatus: (companyListStatus) => set({ companyListStatus }),

  projectListCompanyId: undefined,
  projectListStatus: undefined,
  setProjectListFilter: (projectListCompanyId, projectListStatus) => set({ projectListCompanyId, projectListStatus }),

  userListCompanyId: undefined,
  userListStatus: undefined,
  setUserListFilter: (userListCompanyId, userListStatus) => set({ userListCompanyId, userListStatus }),

  // 로그아웃 시 다른 계정의 필터가 남지 않도록 초기화 (useAuth.ts logout()에서 호출)
  reset: () =>
    set({
      companyListStatus: undefined,
      projectListCompanyId: undefined,
      projectListStatus: undefined,
      userListCompanyId: undefined,
      userListStatus: undefined,
    }),
}));
