import { callSP } from '../config/db';

/** api_index_sync_queue 한 행 */
export interface ApiIndexSyncRow {
  sync_id: number;
  api_id: number;
  attempt_count: number;
  last_error: string | null;
  updated_at: Date;
}

/**
 * rag_server(gm_apis) 동기화 대기 중인 큐 행을 sync_id 오름차순(오래된 순)으로 조회한다.
 * @author trisakion
 * @param limit 한 번에 조회할 최대 건수
 * @returns 대기 중인 큐 행 목록
 */
export async function getPendingApiIndexSync(limit: number): Promise<ApiIndexSyncRow[]> {
  const [, [rows]] = await callSP('SP_GET_PENDING_API_INDEX_SYNC', [limit]);
  return rows as unknown as ApiIndexSyncRow[];
}

/**
 * rag_server push 성공 후 큐 행을 삭제한다. expectedUpdatedAt은 getPendingApiIndexSync()로 조회한
 * 시점의 updated_at을 그대로 넘겨야 한다 — 조회 이후 도메인 SP가 같은 api_id를 다시 수정해 이
 * sync_id가 재큐잉(ON DUPLICATE KEY UPDATE)됐다면 updated_at이 달라져 삭제가 조용히 무시되고,
 * 그 재큐잉된 최신 변경분은 다음 tick에 다시 처리된다(SP_DELETE_API_INDEX_SYNC 주석 참고).
 * 이미 삭제된 sync_id를 다시 넘겨도 오류가 아니다(ROW_COUNT()=0 허용 — idempotent).
 * @author trisakion
 * @param syncId 삭제할 동기화 큐 ID
 * @param expectedUpdatedAt 조회 시점에 읽은 updated_at (낙관적 동시성 가드)
 * @returns void
 */
export async function deleteApiIndexSync(syncId: number, expectedUpdatedAt: Date): Promise<void> {
  await callSP('SP_DELETE_API_INDEX_SYNC', [syncId, expectedUpdatedAt]);
}

/**
 * rag_server push 실패 시 재시도 카운트를 증가시키고 실패 사유를 갱신한다(행은 삭제하지 않음 — 다음 tick 재시도 대상으로 남김).
 * @author trisakion
 * @param syncId 실패 처리할 동기화 큐 ID
 * @param error 실패 사유 (VARCHAR(500) 컬럼 — 호출부에서 길이 제한 필요)
 * @returns void
 */
export async function markApiIndexSyncFailed(syncId: number, error: string): Promise<void> {
  await callSP('SP_MARK_API_INDEX_SYNC_FAILED', [syncId, error]);
}
