import { callSP, logPool } from '../config/db';

/** log_audit_index_sync_queue 한 행 */
export interface LogAuditIndexSyncRow {
  sync_id: number;
  log_audit_id: number;
  attempt_count: number;
  last_error: string | null;
}

/**
 * rag_server(gm_logs) 동기화 대기 중인 큐 행을 sync_id 오름차순(오래된 순)으로 조회한다. log_audit
 * 전용 DB(logPool)에서 실행된다.
 * @author trisakion
 * @param limit 한 번에 조회할 최대 건수
 * @returns 대기 중인 큐 행 목록
 */
export async function getPendingLogAuditIndexSync(limit: number): Promise<LogAuditIndexSyncRow[]> {
  const [, [rows]] = await callSP('SP_GET_PENDING_LOG_AUDIT_INDEX_SYNC', [limit], logPool);
  return rows as unknown as LogAuditIndexSyncRow[];
}

/**
 * rag_server push 성공 후 큐 행을 삭제한다. log_audit은 Append-Only라 재큐잉 자체가 없어(같은
 * log_audit_id가 다시 변경될 수 없음) api_index_sync_queue처럼 낙관적 동시성 가드가 필요 없다 —
 * sync_id만으로 삭제. 이미 삭제된 sync_id를 다시 넘겨도 오류가 아니다(ROW_COUNT()=0 허용 — idempotent).
 * @author trisakion
 * @param syncId 삭제할 동기화 큐 ID
 * @returns void
 */
export async function deleteLogAuditIndexSync(syncId: number): Promise<void> {
  await callSP('SP_DELETE_LOG_AUDIT_INDEX_SYNC', [syncId], logPool);
}

/**
 * rag_server push 실패 시 재시도 카운트를 증가시키고 실패 사유를 갱신한다(행은 삭제하지 않음 — 다음 tick 재시도 대상으로 남김).
 * @author trisakion
 * @param syncId 실패 처리할 동기화 큐 ID
 * @param error 실패 사유 (VARCHAR(500) 컬럼 — 호출부에서 길이 제한 필요)
 * @returns void
 */
export async function markLogAuditIndexSyncFailed(syncId: number, error: string): Promise<void> {
  await callSP('SP_MARK_LOG_AUDIT_INDEX_SYNC_FAILED', [syncId, error], logPool);
}
