import { embed } from "../embedding/embedder";
import { rebuildLogsAndSwap, upsertLogPoints, isLogsIndexHealthy } from "./store";
import { runExclusive } from "../config/db";
import { env } from "../config/env";
import logger from "../utils/logger";
import { LogAuditPoint, LogAuditPointPayload, LogAuditReindexPushBody } from "../types";

// build.ts(CLI)/apiReindex.ts와 다른 이름을 써서 세 컬렉션의 재구축이 서로를 막지 않고 독립적으로 진행되게 한다.
const LOCK_NAME = "rag:reindex:logs";
// docs/apis 쪽 LOCK_TIMEOUT_MS와 동일한 여유 기준("실측 재구축 시간보다 넉넉하게").
const LOCK_TIMEOUT_MS = 60_000;
// server/ GET /internal/log-audits pull 요청 타임아웃 — 페이지 1회 호출 기준(apiReindex.ts의
// PULL_TIMEOUT_MS와 동일한 값, 전체 pull은 여러 페이지에 걸쳐 나뉘어 호출되므로 페이지당 타임아웃으로 충분).
const PULL_TIMEOUT_MS = 30_000;
// 내부 배치 전용 페이지 크기 — 공개 API의 20/30/50/100 제약과 무관하게 이 경로 전용으로 크게 잡아
// 페이지 수(왕복 횟수)를 줄인다. §Context "물량 문제 대응" — 전체를 한 번에 pull하지 않고 페이지 단위로 순회한다.
const PAGE_SIZE = 500;

/**
 * server/가 push/pull로 보낸 완성된 감사 로그 데이터를 Qdrant payload(필터+표시용 필드)로 변환한다.
 * @param item server/가 push/pull로 보낸 완성된 감사 로그 데이터
 * @returns gm_logs 포인트 payload
 */
function toPayload(item: LogAuditReindexPushBody): LogAuditPointPayload {
  return {
    log_audit_id: item.log_audit_id,
    company_id: item.company_id,
    project_id: item.project_id,
    project_name: item.project_name,
    table_name: item.table_name,
    target_id: item.target_id,
    target_name: item.target_name,
    action_type: item.action_type,
    created_by_name: item.created_by_name,
    created_at: item.created_at,
    embed_text: item.embed_text,
  };
}

/**
 * 감사 로그 1건을 gm_logs에 증분 upsert한다. 아웃박스 워커(server/logAuditIndexSync.job.ts)의 push 수신 경로.
 * embed_text는 server/가 before_json/after_json을 diff 문장화한 결과를 그대로 받는다 — rag_server는
 * "passage: " 프리픽스만 붙여 임베딩할 뿐 before/after JSON 자체를 전혀 모른다(MSA 경계).
 * gm_logs alias가 아직 없으면(부팅 자가치유가 아직 안 끝난 경우) store.ts의 upsertLogPoints가 예외를
 * 던진다 — 호출부(컨트롤러)가 그대로 실패 응답하면 워커가 큐에 남겨 다음 tick에 재시도한다.
 * @param item server/가 push한 완성된 감사 로그 데이터
 */
export async function upsertOneLogAudit(item: LogAuditReindexPushBody): Promise<void> {
  const vector = await embed(`passage: ${item.embed_text}`);
  const point: LogAuditPoint = { logAuditId: item.log_audit_id, vector, payload: toPayload(item) };
  await upsertLogPoints([point]);
  logger.info(`gm_logs 증분 upsert 완료: log_audit_id=${item.log_audit_id}`);
}

/**
 * 감사 로그 전체 목록을 gm_logs 새 물리 컬렉션에 전량 upsert하고 alias를 원자적으로 스왑한다(락 없는 raw 동작).
 * forceReindexLogs()/logAuditReindexIfChanged()가 runExclusive로 감싸 호출한다 — 직접 호출 금지.
 * @param items server/가 pull 응답으로 보낸 전체 감사 로그 목록
 * @returns 재구축 결과 요약(건수)
 */
async function rebuild(items: LogAuditReindexPushBody[]): Promise<{ count: number }> {
  logger.info(`감사 로그 전체 재인덱싱 시작: ${items.length}건`);
  const points: LogAuditPoint[] = [];
  for (const item of items)
    points.push({ logAuditId: item.log_audit_id, vector: await embed(`passage: ${item.embed_text}`), payload: toPayload(item) });

  await rebuildLogsAndSwap(points);
  logger.info(`감사 로그 전체 재인덱싱 완료: ${points.length}건`);
  return { count: points.length };
}

/**
 * server/의 GET /internal/log-audits(전체 감사 로그 스냅샷)를 페이지 단위로 순회해 전량 pull한다.
 * apis pull(apiReindex.ts의 pullApisSnapshot, 단일 호출)과 달리 페이지네이션이 필요한 이유는
 * §Context "물량 문제 대응" — 감사 로그는 API 정의보다 훨씬 많을 수 있어 한 HTTP 응답에 전부 담지 않는다.
 * 이 서버 자신의 X-API-Key(env.apiKey)를 그대로 실어 보낸다(server/의 ragKeyAuth.ts가 검증하는 값과
 * 동일한 공유키, apiReindex.ts와 동일 패턴).
 * @returns 전체 감사 로그 목록
 */
async function pullLogAuditSnapshot(): Promise<LogAuditReindexPushBody[]> {
  const headers: Record<string, string> = {};
  if (env.apiKey)
    headers["X-API-Key"] = env.apiKey;

  const all: LogAuditReindexPushBody[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${env.gmPlatformBaseUrl}/internal/log-audits?page=${page}&page_size=${PAGE_SIZE}`, {
      headers,
      signal: AbortSignal.timeout(PULL_TIMEOUT_MS),
    });
    if (!res.ok)
      throw new Error(`GET /internal/log-audits 실패: HTTP ${res.status}`);

    const body = (await res.json()) as {
      result: number;
      message: string;
      data: { total_count: number; items: LogAuditReindexPushBody[] };
    };
    if (body.result !== 0)
      throw new Error(`GET /internal/log-audits 실패: result=${body.result} message=${body.message}`);

    all.push(...body.data.items);
    // server/가 diff 없는(정보량 없는) 행을 items에서 걸러내므로(hasMeaningfulDiff, internal.service.ts)
    // all.length는 total_count보다 항상 작거나 같을 수 있다 — "마지막 페이지를 지났는지"는 필터링과
    // 무관한 원본 페이지네이션 커서(page*PAGE_SIZE)로만 판정한다.
    if (page * PAGE_SIZE >= body.data.total_count)
      break;
    page++;
  }

  return all;
}

/**
 * build.ts(CLI, npm run build-index-logs) 전용 — 항상 무조건 server/에서 전체 스냅샷을 pull해
 * 강제로 재구축한다. reindex.ts(docs)/apiReindex.ts(apis)의 forceReindex 계열과 동일한 설계 의도.
 * MySQL advisory lock으로 logAuditReindexIfChanged()와 상호배제된다.
 * @returns 재구축 결과 요약(건수)
 */
export async function forceReindexLogs(): Promise<{ count: number }> {
  return runExclusive(LOCK_NAME, LOCK_TIMEOUT_MS, async () => {
    const items = await pullLogAuditSnapshot();
    return rebuild(items);
  });
}

/**
 * app.ts(부팅 시) 전용 자가 치유 — gm_logs 인덱스가 정상(alias 존재+points_count>0)이면 아무것도
 * 하지 않는다(이후 증분 반영은 아웃박스 워커가 담당). 비어있으면(최초 배포 또는 외부에서 컬렉션 삭제)
 * 즉시 server/에서 전체 스냅샷을 pull해 강제 재구축한다(apiReindexIfChanged()와 동일 패턴).
 */
export async function logAuditReindexIfChanged(): Promise<void> {
  await runExclusive(LOCK_NAME, LOCK_TIMEOUT_MS, async () => {
    if (await isLogsIndexHealthy()) {
      logger.info("gm_logs 인덱스 정상 — 부팅 시 전체 재구축을 건너뜁니다(증분 반영은 아웃박스 워커가 담당).");
      return;
    }

    logger.warn("gm_logs 인덱스가 없거나 비어 있음 — server/에서 전체 스냅샷을 pull해 재구축합니다.");
    const items = await pullLogAuditSnapshot();
    await rebuild(items);
  });
}
