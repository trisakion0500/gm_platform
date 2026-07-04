import { create } from 'zustand';
import type { ApiExecutionRow } from '../types';

interface ApiWorkspaceState {
  // 좌측 체크박스로 열어둔 API의 api_id 목록 — 배열 순서 = 선택 순서 = 우측 작업영역 렌더링 순서
  openApiIds: number[];
  // 패널별 Request 입력폼 값 (api_id -> { parameter_name: value })
  requestValues: Record<number, Record<string, unknown>>;
  // 패널별 마지막 실행 결과 (api_id -> 실행 이력, 미실행이면 null)
  executionResults: Record<number, ApiExecutionRow | null>;
  // 사이드바 "API" 메뉴 펼침 상태
  menuExpanded: boolean;

  // 체크박스 토글 — 열려있으면 닫고(패널·입력값·결과 제거), 닫혀있으면 맨 뒤에 추가. 닫기(X) 버튼도 동일 함수 재사용해 체크박스와 항상 동기화
  toggleApi: (apiId: number) => void;
  setRequestValue: (apiId: number, values: Record<string, unknown>) => void;
  setExecutionResult: (apiId: number, result: ApiExecutionRow | null) => void;
  setMenuExpanded: (expanded: boolean) => void;
  reset: () => void;
}

// 페이지 이동(사이드바의 다른 메뉴 클릭 등) 후에도 열어둔 패널·입력값이 유지되도록 컴포넌트 local state 대신 스토어에 보관.
// 로그아웃 시(useAuth.ts) 및 헤더에서 프로젝트를 변경할 때(Header.tsx) 초기화 — 다른 프로젝트의 API 패널이 남아있으면 의미가 없으므로.
export const useApiWorkspaceStore = create<ApiWorkspaceState>()((set, get) => ({
  openApiIds: [],
  requestValues: {},
  executionResults: {},
  menuExpanded: true,

  toggleApi: (apiId) => {
    const { openApiIds, requestValues, executionResults } = get();
    if (openApiIds.includes(apiId)) {
      const { [apiId]: _removedValues, ...restValues } = requestValues;
      const { [apiId]: _removedResult, ...restResults } = executionResults;
      set({
        openApiIds: openApiIds.filter((id) => id !== apiId),
        requestValues: restValues,
        executionResults: restResults,
      });
    } else {
      set({
        openApiIds: [...openApiIds, apiId],
        requestValues: { ...requestValues, [apiId]: {} },
        executionResults: { ...executionResults, [apiId]: null },
      });
    }
  },

  setRequestValue: (apiId, values) => set((state) => ({ requestValues: { ...state.requestValues, [apiId]: values } })),
  setExecutionResult: (apiId, result) => set((state) => ({ executionResults: { ...state.executionResults, [apiId]: result } })),
  setMenuExpanded: (menuExpanded) => set({ menuExpanded }),

  reset: () => set({ openApiIds: [], requestValues: {}, executionResults: {} }),
}));
