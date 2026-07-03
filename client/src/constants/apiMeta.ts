// API/Request/Response 관련 코드값 라벨 — 관리(admin)·메인(main) API 화면에서 공통으로 참조한다.

export const API_STAGE_OPTIONS = [
  { value: 20, label: '개발' },
  { value: 30, label: '스테이징' },
  { value: 40, label: '운영' },
];
export const API_STAGE_LABEL: Record<number, string> = { 20: '개발', 30: '스테이징', 40: '운영' };
export const API_STAGE_COLOR: Record<number, string> = { 20: 'default', 30: 'blue', 40: 'green' };

export const APPROVAL_OPTIONS = [
  { value: 0, label: '즉시실행' },
  { value: 1, label: '승인필요' },
];
export const APPROVAL_LABEL: Record<number, string> = { 0: '즉시실행', 1: '승인필요' };

export const RESPONSE_VIEW_TYPE_OPTIONS = [
  { value: 1, label: 'KEY_VALUE' },
  { value: 2, label: 'GRID' },
];
export const RESPONSE_VIEW_TYPE_LABEL: Record<number, string> = { 1: 'KEY_VALUE', 2: 'GRID' };

export const PARAMETER_TYPE_OPTIONS = [
  { value: 1, label: 'STRING' },
  { value: 2, label: 'NUMBER' },
  { value: 3, label: 'BOOLEAN' },
  { value: 4, label: 'DATE' },
  { value: 5, label: 'DATETIME' },
  { value: 6, label: 'JSON' },
];
export const PARAMETER_TYPE_LABEL: Record<number, string> = {
  1: 'STRING', 2: 'NUMBER', 3: 'BOOLEAN', 4: 'DATE', 5: 'DATETIME', 6: 'JSON',
};

export const COMPONENT_TYPE_OPTIONS = [
  { value: 1, label: 'TEXT' },
  { value: 2, label: 'NUMBER' },
  { value: 3, label: 'DATE' },
  { value: 4, label: 'DATETIME' },
  { value: 5, label: 'SELECT' },
  { value: 6, label: 'RADIO' },
  { value: 7, label: 'CHECKBOX' },
];
export const COMPONENT_TYPE_LABEL: Record<number, string> = {
  1: 'TEXT', 2: 'NUMBER', 3: 'DATE', 4: 'DATETIME', 5: 'SELECT', 6: 'RADIO', 7: 'CHECKBOX',
};

// code_group_id가 필요한(=코드값 참조) component_type
export const CODE_BOUND_COMPONENT_TYPES = [5, 6, 7];

export const API_STATUS_MAP = {
  1: { label: '사용', color: 'green' },
  0: { label: '중지', color: 'default' },
};

export const EXECUTION_STATUS_MAP: Record<number, { label: string; color: string }> = {
  10: { label: 'PENDING', color: 'gold' },
  20: { label: 'APPROVED', color: 'blue' },
  30: { label: 'REJECTED', color: 'red' },
  40: { label: 'SUCCESS', color: 'green' },
  50: { label: 'FAILED', color: 'red' },
  60: { label: 'CANCELED', color: 'default' },
};
