import axios from 'axios';
import { env } from '../config/env';
import { runExclusive } from '../config/db';
import * as apiIndexSyncDb from '../db/apiIndexSync.db';
import * as apiService from '../services/api.service';
import * as projectService from '../services/project.service';
import { ApiReindexPushBody } from '../types';
import logger from '../utils/logger';

const LOCK_NAME = 'gm_platform:api_index_sync';
// audit.service.ts의 resolveApiScope()·internal.service.ts와 동일한 관례 — role_code=10이면
// SP 내부에서 user_id 자체를 안 보므로 0은 순수 placeholder(내부 배치가 스코핑을 우회하는 용도).
const SYSTEM_ROLE_CODE = 10;
const SYSTEM_USER_ID = 0;
// 한 tick에 처리할 최대 건수 — 무제한으로 두면 대량 백로그 발생 시 한 tick이 지나치게 길어져
// runExclusive(advisory lock)를 오래 붙잡는다. 남은 건 다음 tick이 이어서 처리(큐는 삭제되지 않는 한 유지됨).
const BATCH_SIZE = 20;
// api_index_sync_queue.last_error 컬럼이 VARCHAR(500)이라 그 이상은 DB에 저장 시 잘림 위험이 있어 미리 자른다.
const ERROR_MESSAGE_MAX_LENGTH = 500;

/**
 * api_id로 완성된 API 데이터를 조립해 rag_server가 요구하는 ApiReindexPushBody 형태로 반환한다.
 * internal.service.ts의 getAllActiveApiSnapshots()와 동일한 SUPER_ADMIN 컨텍스트 조합(getApi+getProject)을
 * 단건 버전으로 재사용한다.
 * @author trisakion
 * @param apiId 대상 API ID
 * @returns rag_server push용 완성된 API 데이터
 */
async function buildPushBody(apiId: number): Promise<ApiReindexPushBody> {
  const { api, requests, responses } = await apiService.getApi(apiId, SYSTEM_ROLE_CODE, SYSTEM_USER_ID);
  const project = await projectService.getProject(api.project_id, SYSTEM_ROLE_CODE, SYSTEM_USER_ID);
  return {
    api_id: api.api_id,
    project_id: api.project_id,
    project_name: project.project_name,
    api_code: api.api_code,
    api_name: api.api_name,
    endpoint: api.endpoint,
    description: api.description,
    api_stage: api.api_stage,
    status: api.status,
    requests: requests.map((r) => ({ parameter_name: r.parameter_name, parameter_label: r.parameter_label, description: r.description })),
    responses: responses.map((r) => ({ parameter_name: r.parameter_name, parameter_label: r.parameter_label, description: r.description })),
  };
}

/**
 * 완성된 API 데이터 1건을 rag_server(POST /apis/reindex)에 push한다.
 * @author trisakion
 * @param body push할 API 데이터
 * @returns void
 * @throws rag_server가 result≠0을 반환하거나 네트워크/타임아웃 오류가 발생하면 던짐
 */
async function pushToRagServer(body: ApiReindexPushBody): Promise<void> {
  const headers = env.rag.apiKey ? { 'X-API-Key': env.rag.apiKey } : undefined;
  const res = await axios.post<{ result: number; message: string }>(`${env.rag.baseUrl}/apis/reindex`, body, {
    timeout: env.apiExecutionTimeoutMs,
    headers,
  });
  if (res.data.result !== 0)
    throw new Error(`rag_server result=${res.data.result} message=${res.data.message}`);
}

/**
 * 대기 중인 큐를 최대 BATCH_SIZE건 조회해 각각 rag_server에 push한다.
 * 성공한 행은 큐에서 삭제, 실패한 행은 attempt_count/last_error만 갱신하고 다음 tick에 재시도한다
 * (무기한 재시도 — 별도 dead-letter 없음, "시간차는 있어도 결국 반드시 일치"라는 설계 의도).
 * 한 행의 실패가 나머지 행 처리를 막지 않도록 행 단위로 개별 try/catch한다.
 * @author trisakion
 * @returns void
 */
async function processPendingQueue(): Promise<void> {
  const pending = await apiIndexSyncDb.getPendingApiIndexSync(BATCH_SIZE);
  if (pending.length === 0)
    return;

  let succeeded = 0;
  for (const row of pending) {
    try {
      const body = await buildPushBody(row.api_id);
      await pushToRagServer(body);
      await apiIndexSyncDb.deleteApiIndexSync(row.sync_id, row.updated_at);
      succeeded++;
    } catch (err) {
      // err 객체·스택을 그대로 로깅하지 않는다 — axios 에러는 config.headers(X-API-Key 평문)를 담고 있다. message만 사용
      // (apiSearch.service.ts의 rag_server 연동 로깅과 동일 원칙).
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`API index sync 실패 - sync_id=${row.sync_id} api_id=${row.api_id}: ${message}`);
      await apiIndexSyncDb.markApiIndexSyncFailed(row.sync_id, message.slice(0, ERROR_MESSAGE_MAX_LENGTH));
    }
  }
  logger.info(`API index sync tick - ${succeeded}/${pending.length}건 반영 완료`);
}

/**
 * api_index_sync_queue(아웃박스)를 주기적으로 폴링해 rag_server(gm_apis)에 반영하는 워커를 등록한다.
 * sessionCleanup.job.ts와 동일하게 runExclusive(advisory lock)로 감싸 스케일아웃 시 인스턴스 간
 * 중복 실행을 막는다. node-cron 대신 재귀 setTimeout을 쓰는 이유: 이 워커는 고정 주기(ms) 폴링이지
 * 특정 시각에 맞춘 크론 스케줄이 아니고, 재귀 구조라 한 tick이 API_INDEX_SYNC_INTERVAL_MS보다
 * 오래 걸려도(대량 백로그 등) 다음 tick과 겹치지 않는다(setInterval이었다면 겹칠 수 있음).
 * env.rag.enabled=false(rag_server 미사용)면 app.ts가 이 함수 자체를 호출하지 않는다.
 * 반환하는 stop 함수는 app.ts의 정상 종료 훅이 호출해 다음 재귀 예약을 멈춘다 — node-cron의
 * ScheduledTask.stop()과 동등한 역할을 재귀 setTimeout 구조에서 직접 구현한 것.
 * @author trisakion
 * @returns 정상 종료 시 호출할 stop 함수
 */
export function startApiIndexSyncJob(): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = async () => {
    try {
      const ran = await runExclusive(LOCK_NAME, processPendingQueue);
      if (!ran)
        logger.debug('API index sync skipped - another instance holds the lock');
    } catch (err) {
      logger.error('API index sync tick failed:', err);
    } finally {
      if (!stopped)
        timer = setTimeout(tick, env.apiIndexSyncIntervalMs);
    }
  };
  tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
