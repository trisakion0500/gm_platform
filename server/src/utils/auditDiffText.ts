import { LogAuditSyncSnapshotRow } from '../types';
import { SKIP_FIELDS } from '../services/logAudit.service';

/** table_name → 사람이 읽는 한국어 라벨. gm_logs 임베딩 텍스트 구성 전용 (docs/21_RAG_SERVER.md §10.3). */
const TABLE_LABELS: Record<string, string> = {
  company: '회사',
  project: '프로젝트',
  user: '사용자',
  user_role: '사용자 역할 배정',
  api: 'API',
  api_request: 'API Request 파라미터',
  api_response: 'API Response 파라미터',
  code_group: '코드 그룹',
  code_item: '코드 아이템',
};

/** action_type → 사람이 읽는 한국어 라벨 (logAudit.service.ts의 action_type 값 정의와 동일). */
const ACTION_LABELS: Record<number, string> = {
  10: '생성',
  20: '수정',
  30: '상태 변경',
};

/**
 * before/after JSON 문자열을 필드 단위로 비교해 사람이 읽는 diff 문장을 만든다.
 * before가 null이면(CREATE) 값 나열, 아니면 변경된 필드만 "필드명: 이전값 → 이후값"으로 나열한다.
 * @author trisakion
 * @param beforeJson 변경 전 데이터 JSON 문자열 (CREATE 시 null)
 * @param afterJson 변경 후 데이터 JSON 문자열
 * @returns diff 문장 (변경된 필드가 없으면 빈 문자열)
 */
export function buildDiffText(beforeJson: string | null, afterJson: string): string {
  const after = JSON.parse(afterJson) as Record<string, unknown>;

  if (beforeJson === null) {
    const parts = Object.entries(after)
      .filter(([k]) => !SKIP_FIELDS.has(k))
      .map(([k, v]) => `${k}=${String(v)}`);
    return parts.length > 0 ? `생성: ${parts.join(', ')}` : '';
  }

  const before = JSON.parse(beforeJson) as Record<string, unknown>;
  const parts = Object.keys(after)
    .filter((k) => !SKIP_FIELDS.has(k) && String(before[k]) !== String(after[k]))
    .map((k) => `${k}: ${String(before[k])} → ${String(after[k])}`);
  return parts.length > 0 ? `변경: ${parts.join('; ')}` : '';
}

/**
 * 감사 로그 1건의 gm_logs 임베딩 입력 텍스트를 구성한다(diff 문장화, docs/21_RAG_SERVER.md §10.3 "임베딩 텍스트").
 * rag_server는 이 결과(embed_text)를 그대로 받아 "passage: " 프리픽스만 붙여 임베딩할 뿐, before_json/after_json
 * 원본은 전혀 모른다(MSA 경계 — Phase 2가 "완성된 데이터를 만들어 push"한 것과 동일 원칙).
 * @author trisakion
 * @param row before_json/after_json을 포함한 감사 로그 행(SP_GET_LOG_AUDIT 또는 SP_GET_LOG_AUDIT_SYNC_SNAPSHOT 조회 결과)
 * @returns 임베딩 직전 텍스트
 */
export function buildEmbedText(row: LogAuditSyncSnapshotRow): string {
  const tableLabel = TABLE_LABELS[row.table_name] ?? row.table_name;
  const actionLabel = ACTION_LABELS[row.action_type] ?? String(row.action_type);
  const target = row.target_name ? `"${row.target_name}"` : row.target_id;
  const projectPart = row.project_name ? ` - ${row.project_name}` : '';

  return [
    `${tableLabel} ${actionLabel}: ${target}${projectPart}`,
    buildDiffText(row.before_json, row.after_json),
    row.created_by_name ? `작업자: ${row.created_by_name}` : '',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}
