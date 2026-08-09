import qdrantClient from "../config/qdrant";
import { env } from "../config/env";
import { Chunk, SearchResult } from "../types";
import logger from "../utils/logger";

// 모델 출력 차원(Xenova/multilingual-e5-base)과 일치해야 한다 — 모델 교체 시 반드시 함께 바꾸고 재인덱싱해야 한다
// (차원이 다르면 rebuildAndSwap이 새 물리 컬렉션을 만들어 자동으로 맞춰주지만, 이 상수 자체는 수동 동기화 필요).
// export하는 이유: reindex.ts의 매니페스트가 이 값을 함께 해시해, 값만 바뀌어도 재인덱싱 대상임을 감지하게 한다.
export const VECTOR_SIZE = 768;

// env.qdrant.collection("gm_docs")은 물리 컬렉션이 아니라 항상 이 이름의 alias를 가리킨다(아래 rebuildAndSwap 참고).
const ALIAS = env.qdrant.collection;

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
 * 현재 ALIAS가 가리키는 물리 컬렉션 이름을 반환한다.
 * @returns 물리 컬렉션 이름, alias가 아직 없으면(최초 구축 전) null
 */
async function getCurrentAliasTarget(): Promise<string | null> {
  const { aliases } = await withSocketRetry(() => qdrantClient.getAliases());
  const match = aliases.find((a) => a.alias_name === ALIAS);
  return match?.collection_name ?? null;
}

/**
 * ALIAS가 가리키는 물리 컬렉션이 실제로 존재하고 데이터를 갖고 있는지 확인한다. 매니페스트
 * 비교(reindex.ts)는 문서 내용 변경 여부만 볼 뿐 Qdrant의 실제 상태를 모르므로, Qdrant 콘솔
 * 등으로 컬렉션/alias를 직접 삭제해도 문서가 그대로면 재인덱싱이 스킵되는 공백이 있었다 — 이
 * 함수로 그 공백을 부팅 시퀀스에서 직접 메운다.
 * @returns alias가 존재하고 points_count > 0이면 true
 */
export async function isIndexHealthy(): Promise<boolean> {
  const target = await getCurrentAliasTarget();
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

/**
 * 청크·벡터를 새 물리 컬렉션에 전량 upsert한 뒤, ALIAS를 그 컬렉션으로 원자적으로 스왑하고
 * 이전 물리 컬렉션을 정리한다(전량 교체 방식, §3). Qdrant의 alias 변경 자체가 원자적이라
 * (delete_alias+create_alias를 한 updateCollectionAliases 호출에 같이 묶으면 그 사이 구간이
 * 없다 — "no collection modifications can happen between alias operations", Qdrant 공식 문서),
 * 검색은 항상 "완전한 옛 인덱스" 아니면 "완전한 새 인덱스"만 보게 되고 재구축 도중의 빈/부분
 * 컬렉션을 절대 관측하지 못한다 — 과거(alias 도입 이전)에 컬렉션을 delete→recreate하던
 * 방식은 그 사이 구간에 검색이 빈 결과를 조용히 반환하는 문제가 있었다.
 * @param chunks 청크 목록
 * @param vectors 청크와 같은 순서·개수의 임베딩 벡터 목록
 */
export async function rebuildAndSwap(chunks: Chunk[], vectors: number[][]): Promise<void> {
  if (chunks.length !== vectors.length)
    throw new Error(`청크(${chunks.length})와 벡터(${vectors.length}) 개수가 일치하지 않습니다`);

  const newCollection = `${ALIAS}_${Date.now()}`;
  await withSocketRetry(() =>
    qdrantClient.createCollection(newCollection, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    }),
  );

  const points = chunks.map((chunk, i) => ({
    id: i,
    vector: vectors[i],
    payload: { file: chunk.file, heading: chunk.heading, text: chunk.text },
  }));
  await withSocketRetry(() => qdrantClient.upsert(newCollection, { wait: true, points }));
  logger.info(`Qdrant 새 컬렉션(${newCollection})에 upsert 완료: ${points.length}건`);

  const oldTarget = await getCurrentAliasTarget();

  // alias 도입 이전 버전이 ALIAS와 같은 이름의 물리 컬렉션을 만들어뒀을 수 있다 — 이름이 겹치면
  // 그 이름으로 alias를 만들 수 없으니 1회성으로 정리한다(이 마이그레이션 구간에서만 잠깐 검색 불가 창이 남음).
  // oldTarget이 있다는 건 ALIAS가 이미 정상적인 alias로 존재한다는 뜻이라, Qdrant는 alias와 같은
  // 이름의 물리 컬렉션을 동시에 허용하지 않으므로 이 경우 레거시 컬렉션은 절대 있을 수 없다 —
  // 매 재구축마다 getCollections()를 반복 호출하지 않도록 마이그레이션이 필요할 때(oldTarget=null)만 확인한다.
  if (!oldTarget) {
    const { collections } = await withSocketRetry(() => qdrantClient.getCollections());
    if (collections.some((c) => c.name === ALIAS)) {
      await withSocketRetry(() => qdrantClient.deleteCollection(ALIAS));
      logger.warn(`레거시(alias 도입 이전) 물리 컬렉션 '${ALIAS}'을 삭제했습니다(1회성 마이그레이션).`);
    }
  }

  const actions = oldTarget
    ? [{ delete_alias: { alias_name: ALIAS } }, { create_alias: { collection_name: newCollection, alias_name: ALIAS } }]
    : [{ create_alias: { collection_name: newCollection, alias_name: ALIAS } }];
  await withSocketRetry(() => qdrantClient.updateCollectionAliases({ actions }));
  logger.info(`Qdrant alias '${ALIAS}' → '${newCollection}' 스왑 완료`);

  if (oldTarget) {
    await withSocketRetry(() => qdrantClient.deleteCollection(oldTarget));
    logger.info(`이전 물리 컬렉션 삭제: ${oldTarget}`);
  }
}

/**
 * 질의 벡터와 가장 유사한 청크를 검색한다. ALIAS로 조회하므로 재구축 중에도 항상 완전한 컬렉션을 본다.
 * @param vector 질의 임베딩 벡터
 * @param limit 반환할 최대 개수
 * @returns 유사도(score) 내림차순 검색 결과
 */
export async function searchSimilar(vector: number[], limit: number): Promise<SearchResult[]> {
  const hits = await withSocketRetry(() =>
    qdrantClient.search(ALIAS, {
      vector,
      limit,
      with_payload: true,
    }),
  );

  return hits.map((hit) => {
    const payload = hit.payload as { file: string; heading: string; text: string };
    return { file: payload.file, heading: payload.heading, text: payload.text, score: hit.score };
  });
}
