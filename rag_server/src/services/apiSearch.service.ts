import { embed } from "../embedding/embedder";
import { searchApis as searchApisInStore } from "../index/store";
import { upsertOneApi } from "../index/apiReindex";
import { ApiSearchHit, ProjectRoleFilter, ApiReindexPushBody } from "../types";

/**
 * project_roles를 Qdrant payload 필터로 변환한다(docs/21_RAG_SERVER.md §10.2 "스코핑").
 * status=1은 항상 강제한다. projectRoles가 null이면(SUPER_ADMIN) 프로젝트 제약 없이 무제한.
 * @param projectRoles 요청자가 실제 활성 배정을 가진 {project_id, role_code}[], SUPER_ADMIN이면 null
 * @returns Qdrant filter 객체
 */
function buildFilter(projectRoles: ProjectRoleFilter[] | null): Record<string, unknown> {
  const must: unknown[] = [{ key: "status", match: { value: 1 } }];
  if (projectRoles === null)
    return { must };

  // role_code <= api_stage 동치 관계(docs/21_RAG_SERVER.md §10.2 "스코핑" 4번)를 range.gte로 재현한다.
  const should = projectRoles.map((pr) => ({
    must: [
      { key: "project_id", match: { value: pr.project_id } },
      { key: "api_stage", range: { gte: pr.role_code } },
    ],
  }));
  return { must, should };
}

/**
 * 질의를 임베딩한 뒤 gm_apis에서 프로젝트×스테이지 스코핑을 적용해 검색한다.
 * @param query 검색어
 * @param topK 반환할 최대 개수
 * @param projectRoles 요청자가 실제 활성 배정을 가진 {project_id, role_code}[], SUPER_ADMIN이면 null
 * @returns 유사도 내림차순 검색 결과
 */
export async function search(
  query: string,
  topK: number,
  projectRoles: ProjectRoleFilter[] | null,
): Promise<ApiSearchHit[]> {
  // 배정된 프로젝트가 하나도 없으면(빈 배열) Qdrant should:[]가 엔진마다 다르게 해석될 위험을
  // 피하기 위해 질의 자체를 생략하고 빈 결과를 즉시 반환한다(어차피 매치될 프로젝트가 없음).
  if (projectRoles !== null && projectRoles.length === 0)
    return [];

  const vector = await embed(`query: ${query}`);
  return searchApisInStore(vector, topK, buildFilter(projectRoles));
}

/**
 * server/의 아웃박스 워커가 push한 API 1건을 gm_apis에 증분 반영한다.
 * @param item server/가 push한 완성된 API 데이터
 */
export async function reindex(item: ApiReindexPushBody): Promise<void> {
  await upsertOneApi(item);
}
