import qdrantClient from "../config/qdrant";
import { env } from "../config/env";
import { Chunk, SearchResult, ApiPoint, ApiPointPayload, ApiSearchHit, LogAuditPoint, LogAuditPointPayload, LogAuditSearchHit } from "../types";
import logger from "../utils/logger";

// 모델 출력 차원(Xenova/multilingual-e5-base)과 일치해야 한다 — 모델 교체 시 반드시 함께 바꾸고 재인덱싱해야 한다
// (차원이 다르면 rebuildAndSwap이 새 물리 컬렉션을 만들어 자동으로 맞춰주지만, 이 상수 자체는 수동 동기화 필요).
// export하는 이유: reindex.ts의 매니페스트가 이 값을 함께 해시해, 값만 바뀌어도 재인덱싱 대상임을 감지하게 한다.
// gm_docs/gm_apis 둘 다 같은 임베딩 모델을 공유하므로 컬렉션별로 따로 두지 않는다.
export const VECTOR_SIZE = 768;

// env.qdrant.collection("gm_docs")은 물리 컬렉션이 아니라 항상 이 이름의 alias를 가리킨다(아래 rebuildAndSwap 참고).
const DOCS_ALIAS = env.qdrant.collection;
// RAG Phase 2(API 정의 검색) 전용 alias — gm_docs와 완전히 분리된 별도 컬렉션.
const APIS_ALIAS = env.qdrant.apisCollection;
// RAG Phase 3(감사로그 검색) 전용 alias — gm_docs/gm_apis와 완전히 분리된 별도 컬렉션.
const LOGS_ALIAS = env.qdrant.logsCollection;

/**
 * undici(HTTP/1.1 keep-alive) 연결 풀의 소켓이 유휴 상태에서 Qdrant 쪽에 의해 닫힌 뒤 재사용되면
 * "other side closed"(원인 코드 UND_ERR_SOCKET)로 실패하는 경우가 있다 — isIndexHealthy() 호출과
 * 그 뒤 임베딩 루프(~수십 초, Qdrant 호출 없음)를 거쳐 rebuildAndSwap()이 같은 커넥션 풀을 다시
 * 쓰려는 시점에 실측 재현됨. 풀은 실패한 소켓을 버리고 다음 시도에서 새 연결을 열기 때문에 1회
 * 재시도로 해결된다 — 그래도 실패하면 진짜 장애로 간주해 원래 오류를 그대로 던진다.
 * @param fn Qdrant 클라이언트 호출
 * @returns fn의 반환값
 */
async function withSocketRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const cause = err instanceof Error ? err.cause : undefined;
    const isStaleSocket = cause instanceof Error && (cause as NodeJS.ErrnoException).code === "UND_ERR_SOCKET";
    if (!isStaleSocket)
      throw err;

    logger.warn("Qdrant 요청이 유휴 커넥션 재사용 실패(UND_ERR_SOCKET)로 끊김 — 1회 재시도합니다.");
    return await fn();
  }
}

/**
 * 지정된 alias가 가리키는 물리 컬렉션 이름을 반환한다.
 * @param alias 확인할 alias 이름
 * @returns 물리 컬렉션 이름, alias가 아직 없으면(최초 구축 전) null
 */
async function getAliasTarget(alias: string): Promise<string | null> {
  const { aliases } = await withSocketRetry(() => qdrantClient.getAliases());
  const match = aliases.find((a) => a.alias_name === alias);
  return match?.collection_name ?? null;
}

/**
 * 지정된 alias가 가리키는 물리 컬렉션이 실제로 존재하고 데이터를 갖고 있는지 확인한다. 매니페스트
 * 비교(reindex.ts)는 문서 내용 변경 여부만 볼 뿐 Qdrant의 실제 상태를 모르므로, Qdrant 콘솔
 * 등으로 컬렉션/alias를 직접 삭제해도 문서가 그대로면 재인덱싱이 스킵되는 공백이 있었다 — 이
 * 함수로 그 공백을 부팅 시퀀스에서 직접 메운다.
 * @param alias 확인할 alias 이름
 * @returns alias가 존재하고 points_count > 0이면 true
 */
async function isCollectionHealthy(alias: string): Promise<boolean> {
  const target = await getAliasTarget(alias);
  if (!target)
    return false;

  try {
    const info = await withSocketRetry(() => qdrantClient.getCollection(target));
    return (info.points_count ?? 0) > 0;
  } catch {
    // alias 메타데이터는 남아있는데 실제 물리 컬렉션이 없는 경우(수동 삭제 등) — getCollection 404
    return false;
  }
}

/** rebuildCollectionAndSwap()에 넘기는 포인트 형태 — 컬렉션마다 payload 타입이 다르다. */
interface QdrantPoint {
  id: number | string;
  vector: number[];
  payload: Record<string, unknown>;
}

// 한 번의 upsert 호출에 담을 최대 포인트 수. Qdrant REST의 기본 요청 크기 제한(32MB)을 안전하게
// 벗어나지 않기 위한 배치 크기 — 포인트 1건은 벡터(768차원, JSON 숫자 배열이라 바이너리보다 훨씬 큼)+
// payload를 합쳐 실측 약 16KB, 500건이면 약 8MB로 제한값의 1/4 수준이라 넉넉한 여유를 둔다.
// RAG Phase 3(gm_logs, 3435건) 전체 재구축에서 이 배치 없이 한 번에 전량 upsert하다가 실제로
// "JSON payload(56.5MB)가 제한(32MB)을 초과" 오류로 부팅이 실패하는 것을 라이브로 확인해 도입했다 —
// gm_docs/gm_apis는 지금까지 우연히 이 한도 아래였을 뿐 같은 위험이 잠재해 있던 공용 코드다.
const UPSERT_BATCH_SIZE = 500;

/**
 * 포인트를 새 물리 컬렉션에 전량 upsert한 뒤, 지정된 alias를 그 컬렉션으로 원자적으로 스왑하고
 * 이전 물리 컬렉션을 정리한다(전량 교체 방식, §3). Qdrant의 alias 변경 자체가 원자적이라
 * (delete_alias+create_alias를 한 updateCollectionAliases 호출에 같이 묶으면 그 사이 구간이
 * 없다 — "no collection modifications can happen between alias operations", Qdrant 공식 문서),
 * 검색은 항상 "완전한 옛 인덱스" 아니면 "완전한 새 인덱스"만 보게 되고 재구축 도중의 빈/부분
 * 컬렉션을 절대 관측하지 못한다 — 과거(alias 도입 이전)에 컬렉션을 delete→recreate하던
 * 방식은 그 사이 구간에 검색이 빈 결과를 조용히 반환하는 문제가 있었다.
 * upsert 자체는 UPSERT_BATCH_SIZE 단위로 나눠 순차 호출한다(Qdrant 요청 크기 제한 대응) — 이 배치들은
 * 전부 아직 alias가 가리키지 않는 새 컬렉션에만 쓰는 것이라, 배치 중간에 실패해도 검색 트래픽(항상
 * alias 경유)에는 전혀 영향이 없다(부팅 재시도 루프가 다음 시도에서 새 컬렉션을 처음부터 다시 만듦).
 * @param alias 스왑할 alias 이름(gm_docs/gm_apis 등)
 * @param points 새로 구축할 포인트 목록
 */
async function rebuildCollectionAndSwap(alias: string, points: QdrantPoint[]): Promise<void> {
  const newCollection = `${alias}_${Date.now()}`;
  await withSocketRetry(() =>
    qdrantClient.createCollection(newCollection, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    }),
  );

  for (let i = 0; i < points.length; i += UPSERT_BATCH_SIZE) {
    const batch = points.slice(i, i + UPSERT_BATCH_SIZE);
    await withSocketRetry(() => qdrantClient.upsert(newCollection, { wait: true, points: batch }));
  }
  logger.info(`Qdrant 새 컬렉션(${newCollection})에 upsert 완료: ${points.length}건`);

  const oldTarget = await getAliasTarget(alias);

  // alias 도입 이전 버전이 ALIAS와 같은 이름의 물리 컬렉션을 만들어뒀을 수 있다 — 이름이 겹치면
  // 그 이름으로 alias를 만들 수 없으니 1회성으로 정리한다(이 마이그레이션 구간에서만 잠깐 검색 불가 창이 남음).
  // oldTarget이 있다는 건 alias가 이미 정상적인 alias로 존재한다는 뜻이라, Qdrant는 alias와 같은
  // 이름의 물리 컬렉션을 동시에 허용하지 않으므로 이 경우 레거시 컬렉션은 절대 있을 수 없다 —
  // 매 재구축마다 getCollections()를 반복 호출하지 않도록 마이그레이션이 필요할 때(oldTarget=null)만 확인한다.
  if (!oldTarget) {
    const { collections } = await withSocketRetry(() => qdrantClient.getCollections());
    if (collections.some((c) => c.name === alias)) {
      await withSocketRetry(() => qdrantClient.deleteCollection(alias));
      logger.warn(`레거시(alias 도입 이전) 물리 컬렉션 '${alias}'을 삭제했습니다(1회성 마이그레이션).`);
    }
  }

  const actions = oldTarget
    ? [{ delete_alias: { alias_name: alias } }, { create_alias: { collection_name: newCollection, alias_name: alias } }]
    : [{ create_alias: { collection_name: newCollection, alias_name: alias } }];
  await withSocketRetry(() => qdrantClient.updateCollectionAliases({ actions }));
  logger.info(`Qdrant alias '${alias}' → '${newCollection}' 스왑 완료`);

  if (oldTarget) {
    await withSocketRetry(() => qdrantClient.deleteCollection(oldTarget));
    logger.info(`이전 물리 컬렉션 삭제: ${oldTarget}`);
  }
}

/**
 * 지정된 alias가 가리키는 현재 컬렉션에 포인트를 upsert한다(전량 교체가 아닌 증분 반영).
 * alias가 아직 없으면(gm_apis 최초 구축 전) 예외를 던진다 — 호출부(apiReindex.ts)가 이 경우
 * 부팅 시 자가치유(전량 재구축)로 먼저 alias를 만들어두는 것을 전제로 한다.
 * 실제 upsert는 getAliasTarget()이 미리 조회해둔 물리 컬렉션명이 아니라 alias 이름 자체로 호출한다
 * (searchCollection()과 동일한 이유) — 물리명을 캡처해두면 이 함수가 실행되는 도중 전체 재구축의
 * alias 스왑+이전 컬렉션 삭제가 끼어들 때, 캡처해둔(곧 삭제될) 옛 컬렉션에 조용히 성공해버리고
 * 뒤이어 그 컬렉션이 삭제되며 에러 없이 유실되는 레이스가 있었다. alias로 직접 호출하면 Qdrant가
 * 매 호출 시점에 최신 물리 컬렉션으로 원자적으로 풀어주므로 이 창 자체가 사라진다.
 * @param alias 대상 alias 이름
 * @param points upsert할 포인트 목록
 */
async function upsertPoints(alias: string, points: QdrantPoint[]): Promise<void> {
  const target = await getAliasTarget(alias);
  if (!target)
    throw new Error(`alias '${alias}'가 존재하지 않습니다 — 증분 upsert 전에 전량 재구축이 먼저 필요합니다.`);

  await withSocketRetry(() => qdrantClient.upsert(alias, { wait: true, points }));
}

/**
 * 지정된 alias에서 질의 벡터와 가장 유사한 포인트를 검색한다. alias로 조회하므로 재구축 중에도
 * 항상 완전한 컬렉션을 본다.
 * @param alias 검색할 alias 이름
 * @param vector 질의 임베딩 벡터
 * @param limit 반환할 최대 개수
 * @param filter Qdrant payload 필터(선택)
 * @returns Qdrant 검색 결과(payload+score) 원본
 */
async function searchCollection(
  alias: string,
  vector: number[],
  limit: number,
  filter?: Record<string, unknown>,
): Promise<Array<{ payload: Record<string, unknown>; score: number }>> {
  const hits = await withSocketRetry(() =>
    qdrantClient.search(alias, {
      vector,
      limit,
      filter: filter as never,
      with_payload: true,
    }),
  );
  return hits.map((hit) => ({ payload: (hit.payload ?? {}) as Record<string, unknown>, score: hit.score }));
}

// ---------------------------------------------------------------------------------------------
// gm_docs(Phase 1) 전용 — 기존 reindex.ts/docSearch.service.ts가 쓰는 시그니처를 그대로 유지한다.
// ---------------------------------------------------------------------------------------------

/**
 * ALIAS(gm_docs)가 가리키는 물리 컬렉션이 실제로 존재하고 데이터를 갖고 있는지 확인한다.
 * @returns alias가 존재하고 points_count > 0이면 true
 */
export async function isIndexHealthy(): Promise<boolean> {
  return isCollectionHealthy(DOCS_ALIAS);
}

/**
 * 청크·벡터를 gm_docs 새 물리 컬렉션에 전량 upsert한 뒤 alias를 원자적으로 스왑한다.
 * @param chunks 청크 목록
 * @param vectors 청크와 같은 순서·개수의 임베딩 벡터 목록
 */
export async function rebuildAndSwap(chunks: Chunk[], vectors: number[][]): Promise<void> {
  if (chunks.length !== vectors.length)
    throw new Error(`청크(${chunks.length})와 벡터(${vectors.length}) 개수가 일치하지 않습니다`);

  const points: QdrantPoint[] = chunks.map((chunk, i) => ({
    id: i,
    vector: vectors[i],
    payload: { file: chunk.file, heading: chunk.heading, text: chunk.text },
  }));
  await rebuildCollectionAndSwap(DOCS_ALIAS, points);
}

/**
 * gm_docs에서 질의 벡터와 가장 유사한 청크를 검색한다.
 * @param vector 질의 임베딩 벡터
 * @param limit 반환할 최대 개수
 * @returns 유사도(score) 내림차순 검색 결과
 */
export async function searchSimilar(vector: number[], limit: number): Promise<SearchResult[]> {
  const hits = await searchCollection(DOCS_ALIAS, vector, limit);
  return hits.map((hit) => {
    const payload = hit.payload as { file: string; heading: string; text: string };
    return { file: payload.file, heading: payload.heading, text: payload.text, score: hit.score };
  });
}

// ---------------------------------------------------------------------------------------------
// gm_apis(Phase 2) 전용 — RAG Phase 2(API 정의 검색). point id = api_id(고정 정수 ID라 증분
// upsert 시 같은 id에 payload만 덮어쓰면 되고, docs처럼 순번 재부여를 신경 쓸 필요가 없다.
// ---------------------------------------------------------------------------------------------

/**
 * APIS_ALIAS(gm_apis)가 가리키는 물리 컬렉션이 실제로 존재하고 데이터를 갖고 있는지 확인한다.
 * @returns alias가 존재하고 points_count > 0이면 true
 */
export async function isApisIndexHealthy(): Promise<boolean> {
  return isCollectionHealthy(APIS_ALIAS);
}

/**
 * API 포인트 전체를 gm_apis 새 물리 컬렉션에 전량 upsert한 뒤 alias를 원자적으로 스왑한다.
 * pull 기반 전체 재구축(부팅 자가치유·npm run build-index-apis) 전용 — 증분 반영은 upsertApiPoints() 참고.
 * @param points api_id를 point id로 하는 포인트 목록
 */
export async function rebuildApisAndSwap(points: ApiPoint[]): Promise<void> {
  const qdrantPoints: QdrantPoint[] = points.map((p) => ({
    id: p.apiId,
    vector: p.vector,
    payload: p.payload as unknown as Record<string, unknown>,
  }));
  await rebuildCollectionAndSwap(APIS_ALIAS, qdrantPoints);
}

/**
 * API 포인트를 gm_apis 현재 alias 대상 컬렉션에 증분 upsert한다(전량 교체 아님).
 * 아웃박스 워커(apiIndexSync.job.ts)가 push한 API 1건을 반영하는 경로 전용.
 * @param points api_id를 point id로 하는 포인트 목록(보통 1건)
 */
export async function upsertApiPoints(points: ApiPoint[]): Promise<void> {
  const qdrantPoints: QdrantPoint[] = points.map((p) => ({
    id: p.apiId,
    vector: p.vector,
    payload: p.payload as unknown as Record<string, unknown>,
  }));
  await upsertPoints(APIS_ALIAS, qdrantPoints);
}

/**
 * gm_apis에서 질의 벡터와 가장 유사한 API를 검색한다. project_id×api_stage 스코핑은 filter로 전달한다.
 * @param vector 질의 임베딩 벡터
 * @param limit 반환할 최대 개수
 * @param filter Qdrant payload 필터(project_roles 기반 should 절 등)
 * @returns 유사도(score) 내림차순 검색 결과
 */
export async function searchApis(
  vector: number[],
  limit: number,
  filter: Record<string, unknown>,
): Promise<ApiSearchHit[]> {
  const hits = await searchCollection(APIS_ALIAS, vector, limit, filter);
  return hits.map((hit) => {
    // api_stage/status는 필터 전용 payload 필드라 응답에는 명시적으로 필요한 필드만 골라 노출한다
    // (payload를 그대로 spread하지 않음 — docs/21_RAG_SERVER.md §10.2 응답 명세와 일치시킴).
    const payload = hit.payload as unknown as ApiPointPayload;
    return {
      api_id: payload.api_id,
      project_id: payload.project_id,
      project_name: payload.project_name,
      api_name: payload.api_name,
      api_code: payload.api_code,
      endpoint: payload.endpoint,
      score: hit.score,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// gm_logs(Phase 3) 전용 — RAG Phase 3(감사로그 검색). point id = log_audit_id(고정 정수 ID, log_audit이
// Append-Only라 같은 id가 재사용되지 않으므로 증분 upsert도 항상 "새 포인트 추가"만 일어난다).
// ---------------------------------------------------------------------------------------------

/**
 * LOGS_ALIAS(gm_logs)가 가리키는 물리 컬렉션이 실제로 존재하고 데이터를 갖고 있는지 확인한다.
 * @returns alias가 존재하고 points_count > 0이면 true
 */
export async function isLogsIndexHealthy(): Promise<boolean> {
  return isCollectionHealthy(LOGS_ALIAS);
}

/**
 * 감사 로그 포인트 전체를 gm_logs 새 물리 컬렉션에 전량 upsert한 뒤 alias를 원자적으로 스왑한다.
 * pull 기반 전체 재구축(부팅 자가치유·npm run build-index-logs) 전용 — 증분 반영은 upsertLogPoints() 참고.
 * @param points log_audit_id를 point id로 하는 포인트 목록
 */
export async function rebuildLogsAndSwap(points: LogAuditPoint[]): Promise<void> {
  const qdrantPoints: QdrantPoint[] = points.map((p) => ({
    id: p.logAuditId,
    vector: p.vector,
    payload: p.payload as unknown as Record<string, unknown>,
  }));
  await rebuildCollectionAndSwap(LOGS_ALIAS, qdrantPoints);
}

/**
 * 감사 로그 포인트를 gm_logs 현재 alias 대상 컬렉션에 증분 upsert한다(전량 교체 아님).
 * 아웃박스 워커(logAuditIndexSync.job.ts)가 push한 로그 1건을 반영하는 경로 전용.
 * @param points log_audit_id를 point id로 하는 포인트 목록(보통 1건)
 */
export async function upsertLogPoints(points: LogAuditPoint[]): Promise<void> {
  const qdrantPoints: QdrantPoint[] = points.map((p) => ({
    id: p.logAuditId,
    vector: p.vector,
    payload: p.payload as unknown as Record<string, unknown>,
  }));
  await upsertPoints(LOGS_ALIAS, qdrantPoints);
}

/**
 * gm_logs에서 질의 벡터와 가장 유사한 감사 로그를 검색한다. project_id×company_id 스코핑은 filter로 전달한다.
 * @param vector 질의 임베딩 벡터
 * @param limit 반환할 최대 개수
 * @param filter Qdrant payload 필터(scope 기반 should 절 등)
 * @returns 유사도(score) 내림차순 검색 결과
 */
export async function searchLogs(
  vector: number[],
  limit: number,
  filter: Record<string, unknown>,
): Promise<LogAuditSearchHit[]> {
  const hits = await searchCollection(LOGS_ALIAS, vector, limit, filter);
  return hits.map((hit) => {
    const payload = hit.payload as unknown as LogAuditPointPayload;
    return {
      log_audit_id: payload.log_audit_id,
      table_name: payload.table_name,
      target_id: payload.target_id,
      target_name: payload.target_name,
      action_type: payload.action_type,
      project_name: payload.project_name,
      created_by_name: payload.created_by_name,
      created_at: payload.created_at,
      embed_text: payload.embed_text,
      score: hit.score,
    };
  });
}
