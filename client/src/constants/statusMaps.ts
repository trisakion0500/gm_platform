import type { StatusBadgeMap } from '../components/common/StatusBadge';

// 회사/프로젝트/사용자-역할 등 활성(1)·비활성(0) 상태 공통 라벨
export const ACTIVE_STATUS_MAP: StatusBadgeMap = {
  1: { label: '활성', color: 'green' },
  0: { label: '비활성', color: 'default' },
};

// log_audit.action_type 공통 라벨 — AuditLogListPage/AuditLogDetailPage/LogAuditSearchPage에서 공유
export const LOG_AUDIT_ACTION_TYPE_MAP: StatusBadgeMap = {
  10: { label: '생성', color: 'green' },
  20: { label: '수정', color: 'blue' },
  30: { label: '상태변경', color: 'gold' },
};

// log_audit.table_name 옵션 목록(필터 콤보박스용) + 라벨 조회 맵
export const LOG_AUDIT_TABLE_NAME_OPTIONS = [
  { value: 'company', label: '회사' },
  { value: 'project', label: '프로젝트' },
  { value: 'user', label: '사용자' },
  { value: 'user_role', label: '사용자 권한' },
  { value: 'code_group', label: '코드그룹' },
  { value: 'code_item', label: '코드아이템' },
  { value: 'api', label: 'API' },
  { value: 'api_request', label: 'API Request' },
  { value: 'api_response', label: 'API Response' },
];

export const LOG_AUDIT_TABLE_NAME_LABEL: Record<string, string> =
  Object.fromEntries(LOG_AUDIT_TABLE_NAME_OPTIONS.map((o) => [o.value, o.label]));
