import axios from 'axios';
import { env } from '../config/env';
import { runExclusive } from '../config/db';
import * as logAuditIndexSyncDb from '../db/logAuditIndexSync.db';
import * as logAuditDb from '../db/logAudit.db';
import { buildEmbedText } from '../utils/auditDiffText';
import { LogAuditReindexPushBody, LogAuditSyncSnapshotRow } from '../types';
import logger from '../utils/logger';

const LOCK_NAME = 'gm_platform:log_audit_index_sync';
// logAudit.db.ts의 getLogAudit()이 요구하는 SUPER_ADMIN 우회 관례(apiIndexSync.job.ts의
// SYSTEM_ROLE_CODE/SYSTEM_USER_ID와 동일) — role_code=10이면 SP 내부에서 allowedProjectIds/companyId를
// 안 보므로 나머지 인자는 순수 placeholder다.
const SYSTEM_ROLE_CODE = 10;
// 한 tick에 처리할 최대 건수 — apiIndexSync.job.ts와 동일한 이유(runExclusive를 오래 붙잡지 않기 위함).
const BATCH_SIZE = 20;
// log_audit_index_sync_queue.last_error 컬럼이 VARCHAR(500)이라 그 이상은 DB 저장 시 잘림 위험이 있어 미리 자른다.
const ERROR_MESSAGE_MAX_LENGTH = 500;

/**
 * log_audit_id로 완성된 감사 로그 데이터를 조립해 rag_server가 요구하는 LogAuditReindexPushBody
 * 형태로 반환한다. before_json/after_json은 diff 문장화(auditDiffText.ts)만 거치고 그 자체는
 * push 본문에 포함하지 않는다(MSA 경계).
 * @author trisakion
 * @param logAuditId 대상 감사 로그 ID
 * @returns rag_server push용 완성된 감사 로그 데이터
 */
async function buildPushBody(logAuditId: number): Promise<LogAuditReindexPushBody> {
  const row = await logAuditDb.getLogAudit(logAuditId, SYSTEM_ROLE_CODE, '', 0);
  const snapshot: LogAuditSyncSnapshotRow = {
    log_audit_id: row.log_audit_id,
    company_id: row.company_id,
    project_id: row.project_id,
    project_name: row.project_name,
    table_name: row.table_name,
    target_id: row.target_id,
    target_name: row.target_name,
    action_type: row.action_type,
    before_json: row.before_json ?? null,
    after_json: row.after_json!,
    created_by_name: row.created_by_name,
    created_at: row.created_at,
  };
  return {
    log_audit_id: snapshot.log_audit_id,
    company_id: snapshot.company_id,
    project_id: snapshot.project_id,
    project_name: snapshot.project_name,
    table_name: snapshot.table_name,
    target_id: snapshot.target_id,
    target_name: snapshot.target_name,
    action_type: snapshot.action_type,
    created_by_name: snapshot.created_by_name,
    created_at: snapshot.created_at.toISOString(),
    embed_text: buildEmbedText(snapshot),
  };
}

/**
 * 완성된 감사 로그 데이터 1건을 rag_server(POST /log-audits/reindex)에 push한다.
 * @author trisakion
 * @param body push할 감사 로그 데이터
 * @returns void
 * @throws rag_server가 result≠0을 반환하거나 네트워크/타임아웃 오류가 발생하면 던짐
 */
async function pushToRagServer(body: LogAuditReindexPushBody): Promise<void> {
  const headers = env.rag.apiKey ? { 'X-API-Key': env.rag.apiKey } : undefined;
  const res = await axios.post<{ result: number; message: string }>(`${env.rag.baseUrl}/log-audits/reindex`, body, {
    timeout: env.apiExecutionTimeoutMs,
    headers,
  });
  if (res.data.result !== 0)
    throw new Error(`rag_server result=${res.data.result} message=${res.data.message}`);
}

/**
 * 대기 중인 큐를 최대 BATCH_SIZE건 조회해 각각 rag_server에 push한다.
 * 성공한 행은 큐에서 삭제, 실패한 행은 attempt_count/last_error만 갱신하고 다음 tick에 재시도한다
 * (무기한 재시도 — apiIndexSync.job.ts와 동일한 "확실한 전달 보장" 설계 의도).
 * @author trisakion
 * @returns void
 */
async function processPendingQueue(): Promise<void> {
  const pending = await logAuditIndexSyncDb.getPendingLogAuditIndexSync(BATCH_SIZE);
  if (pending.length === 0)
    return;

  let succeeded = 0;
  for (const row of pending) {
    try {
      const body = await buildPushBody(row.log_audit_id);
      await pushToRagServer(body);
      await logAuditIndexSyncDb.deleteLogAuditIndexSync(row.sync_id);
      succeeded++;
    } catch (err) {
      // apiIndexSync.job.ts와 동일 원칙 — axios 에러는 config.headers(X-API-Key 평문)를 담고 있어 message만 로깅.
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Log audit index sync 실패 - sync_id=${row.sync_id} log_audit_id=${row.log_audit_id}: ${message}`);
      await logAuditIndexSyncDb.markLogAuditIndexSyncFailed(row.sync_id, message.slice(0, ERROR_MESSAGE_MAX_LENGTH));
    }
  }
  logger.info(`Log audit index sync tick - ${succeeded}/${pending.length}건 반영 완료`);
}

/**
 * log_audit_index_sync_queue(아웃박스)를 주기적으로 폴링해 rag_server(gm_logs)에 반영하는 워커를 등록한다.
 * apiIndexSync.job.ts와 동일하게 runExclusive(advisory lock, 메인 DB)로 인스턴스 간 중복 실행을 막고,
 * 재귀 setTimeout으로 한 tick이 오래 걸려도 다음 tick과 겹치지 않게 한다. env.rag.enabled=false면
 * app.ts가 이 함수 자체를 호출하지 않는다.
 * @author trisakion
 * @returns void
 */
export function startLogAuditIndexSyncJob(): void {
  const tick = async () => {
    try {
      const ran = await runExclusive(LOCK_NAME, processPendingQueue);
      if (!ran)
        logger.debug('Log audit index sync skipped - another instance holds the lock');
    } catch (err) {
      logger.error('Log audit index sync tick failed:', err);
    } finally {
      setTimeout(tick, env.logAuditIndexSyncIntervalMs);
    }
  };
  tick();
}
