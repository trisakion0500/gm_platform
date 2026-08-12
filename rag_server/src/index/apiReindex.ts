import { embed } from "../embedding/embedder";
import { rebuildApisAndSwap, upsertApiPoints, isApisIndexHealthy } from "./store";
import { runExclusive } from "../config/db";
import { env } from "../config/env";
import logger from "../utils/logger";
import { ApiPoint, ApiPointPayload, ApiReindexPushBody } from "../types";

// build.ts(CLI)/apiReindexIfChanged()가 공유하는 MySQL advisory lock 이름 — reindex.ts(docs)와
// 다른 이름을 써서 두 컬렉션의 재구축이 서로를 막지 않고 독립적으로 진행되게 한다.
const LOCK_NAME = "rag:reindex:apis";
// docs 쪽 LOCK_TIMEOUT_MS와 동일한 여유 기준("실측 재구축 시간보다 넉넉하게").
const LOCK_TIMEOUT_MS = 60_000;
// server/ GET /internal/apis pull 요청 타임아웃 — 부팅 재시도(bootstrapWithRetry)에 편입되므로
// 여기서 너무 오래 물려있지 않도록 넉넉하되 유한하게 잡는다.
const PULL_TIMEOUT_MS = 30_000;

/**
 * API 1건의 임베딩 입력 텍스트를 구성한다. "passage: " 프리픽스는 multilingual-e5 계열의
 * 비대칭 인코딩 요구사항(reindex.ts의 문서 쪽과 동일한 이유, docs/21_RAG_SERVER.md §3.1).
 * @param item server/가 push/pull로 보낸 완성된 API 데이터
 * @returns 임베딩 직전 텍스트
 */
function buildEmbedText(item: ApiReindexPushBody): string {
  const requestLabels = item.requests.map((r) => r.parameter_label).join(", ");
  const responseLabels = item.responses.map((r) => r.parameter_label).join(", ");
  return [
    `passage: ${item.api_name} (${item.api_code})`,
    item.description ?? "",
    `Endpoint: ${item.endpoint}`,
    requestLabels ? `Request: ${requestLabels}` : "",
    responseLabels ? `Response: ${responseLabels}` : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * server/가 보낸 완성된 API 데이터를 Qdrant payload(필터+표시용 필드)로 변환한다.
 * @param item server/가 push/pull로 보낸 완성된 API 데이터
 * @returns gm_apis 포인트 payload
 */
function toPayload(item: ApiReindexPushBody): ApiPointPayload {
  return {
    api_id: item.api_id,
    project_id: item.project_id,
    project_name: item.project_name,
    api_code: item.api_code,
    api_name: item.api_name,
    endpoint: item.endpoint,
    api_stage: item.api_stage,
    status: item.status,
  };
}

/**
 * API 1건을 gm_apis에 증분 upsert한다. 아웃박스 워커(server/apiIndexSync.job.ts)의 push 수신 경로.
 * gm_apis alias가 아직 없으면(부팅 자가치유가 아직 안 끝난 경우) store.ts의 upsertApiPoints가
 * 예외를 던진다 — 호출부(컨트롤러)가 그대로 실패 응답하면 워커가 큐에 남겨 다음 tick에 재시도한다.
 * @param item server/가 push한 완성된 API 데이터
 */
export async function upsertOneApi(item: ApiReindexPushBody): Promise<void> {
  const vector = await embed(buildEmbedText(item));
  const point: ApiPoint = { apiId: item.api_id, vector, payload: toPayload(item) };
  await upsertApiPoints([point]);
  logger.info(`gm_apis 증분 upsert 완료: api_id=${item.api_id}`);
}

/**
 * API 전체 목록을 gm_apis 새 물리 컬렉션에 전량 upsert하고 alias를 원자적으로 스왑한다(락 없는 raw 동작).
 * forceReindexApis()/apiReindexIfChanged()가 runExclusive로 감싸 호출한다 — 직접 호출 금지.
 * @param items server/가 pull 응답으로 보낸 전체 활성 API 목록
 * @returns 재구축 결과 요약(건수)
 */
async function rebuild(items: ApiReindexPushBody[]): Promise<{ count: number }> {
  logger.info(`API 전체 재인덱싱 시작: ${items.length}건`);
  const points: ApiPoint[] = [];
  for (const item of items)
    points.push({ apiId: item.api_id, vector: await embed(buildEmbedText(item)), payload: toPayload(item) });

  await rebuildApisAndSwap(points);
  logger.info(`API 전체 재인덱싱 완료: ${points.length}건`);
  return { count: points.length };
}

/**
 * server/의 GET /internal/apis(전체 활성 API 스냅샷)를 pull한다. 이 서버 자신의 X-API-Key(env.apiKey)를
 * 그대로 실어 보낸다 — server/의 ragKeyAuth.ts가 검증하는 값과 동일한 공유키(docs/21_RAG_SERVER.md §10.2).
 * @returns 전체 활성 API 목록
 */
async function pullApisSnapshot(): Promise<ApiReindexPushBody[]> {
  const headers: Record<string, string> = {};
  if (env.apiKey)
    headers["X-API-Key"] = env.apiKey;

  const res = await fetch(`${env.gmPlatformBaseUrl}/internal/apis`, {
    headers,
    signal: AbortSignal.timeout(PULL_TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(`GET /internal/apis 실패: HTTP ${res.status}`);

  const body = (await res.json()) as { result: number; message: string; data: ApiReindexPushBody[] };
  if (body.result !== 0)
    throw new Error(`GET /internal/apis 실패: result=${body.result} message=${body.message}`);

  return body.data;
}

/**
 * build.ts(CLI, npm run build-index-apis) 전용 — 항상 무조건 server/에서 전체 스냅샷을 pull해
 * 강제로 재구축한다. reindex.ts(docs)의 forceReindex()와 동일한 설계 의도("언제든 강제 재구축
 * 가능한 수동 CLI"). MySQL advisory lock으로 apiReindexIfChanged()와 상호배제된다.
 * @returns 재구축 결과 요약(건수)
 */
export async function forceReindexApis(): Promise<{ count: number }> {
  return runExclusive(LOCK_NAME, LOCK_TIMEOUT_MS, async () => {
    const items = await pullApisSnapshot();
    return rebuild(items);
  });
}

/**
 * app.ts(부팅 시) 전용 자가 치유 — gm_apis 인덱스가 정상(alias 존재+points_count>0)이면 아무것도
 * 하지 않는다(이후 증분 반영은 아웃박스 워커가 담당하므로 부팅 시점엔 diff 비교 자체가 필요 없다 —
 * docs처럼 파일 해시 매니페스트가 없는 이유). 비어있으면(최초 배포 또는 외부에서 컬렉션 삭제) 즉시
 * server/에서 전체 스냅샷을 pull해 강제 재구축한다(docs/21_RAG_SERVER.md §10.2 "백필/자가치유 경로").
 */
export async function apiReindexIfChanged(): Promise<void> {
  await runExclusive(LOCK_NAME, LOCK_TIMEOUT_MS, async () => {
    if (await isApisIndexHealthy()) {
      logger.info("gm_apis 인덱스 정상 — 부팅 시 전체 재구축을 건너뜁니다(증분 반영은 아웃박스 워커가 담당).");
      return;
    }

    logger.warn("gm_apis 인덱스가 없거나 비어 있음 — server/에서 전체 스냅샷을 pull해 재구축합니다.");
    const items = await pullApisSnapshot();
    await rebuild(items);
  });
}
