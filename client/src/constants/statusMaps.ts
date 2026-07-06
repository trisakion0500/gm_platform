import type { StatusBadgeMap } from '../components/common/StatusBadge';

// 회사/프로젝트/사용자-역할 등 활성(1)·비활성(0) 상태 공통 라벨
export const ACTIVE_STATUS_MAP: StatusBadgeMap = {
  1: { label: '활성', color: 'green' },
  0: { label: '비활성', color: 'default' },
};
