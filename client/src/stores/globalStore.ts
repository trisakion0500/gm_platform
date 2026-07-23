import { create } from 'zustand';
import type { ActiveCompany, ActiveProject, RoleCode } from '../types';

interface GlobalState {
  companyList: ActiveCompany[];
  projectList: ActiveProject[];
  selectedCompanyId: number | null;
  selectedProjectId: number | null;
  // 선택된 프로젝트에서 내 실제 role_code (GET /user-roles/me) — 로그인 시 JWT의 role_code(최고 권한)와 다를 수 있음
  projectRoleCode: RoleCode | null;
  setCompanyList: (list: ActiveCompany[]) => void;
  setProjectList: (list: ActiveProject[]) => void;
  selectCompany: (companyId: number | null) => void;
  selectProject: (projectId: number | null) => void;
  setProjectRoleCode: (roleCode: RoleCode | null) => void;
  reset: () => void;
}

export const useGlobalStore = create<GlobalState>()((set) => ({
  companyList: [],
  projectList: [],
  selectedCompanyId: null,
  selectedProjectId: null,
  projectRoleCode: null,
  setCompanyList: (companyList) => set({ companyList }),
  setProjectList: (projectList) => set({ projectList }),
  // 회사 변경 시 프로젝트 선택은 초기화 (16_LAYOUT.md §2.1)
  selectCompany: (selectedCompanyId) => set({ selectedCompanyId, selectedProjectId: null, projectRoleCode: null }),
  selectProject: (selectedProjectId) => set({ selectedProjectId, projectRoleCode: null }),
  setProjectRoleCode: (projectRoleCode) => set({ projectRoleCode }),
  reset: () => set({ companyList: [], projectList: [], selectedCompanyId: null, selectedProjectId: null, projectRoleCode: null }),
}));
