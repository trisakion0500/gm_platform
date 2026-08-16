import { embed } from "../embedding/embedder";
import { searchLogs as searchLogsInStore } from "../index/store";
import { upsertOneLogAudit } from "../index/logAuditReindex";
import { LogAuditSearchHit, LogAuditScopeFilter, LogAuditReindexPushBody } from "../types";

/**
 * scope를 Qdrant payload 필터로 변환한다(docs/21_RAG_SERVER.md §10.3 "스코핑").
 * scope가 null이면(SUPER_ADMIN) 무제한 — 필터 없음. 그 외에는 project_id 있는 로그는
 * allowed_project_ids 멤버십(match.any)으로, project_id 없는 로그(company/user 테이블)는
 * project_id가 NULL이면서 company_id가 caller_company_id와 일치하는 것으로 판정한다.
 * Phase 2(gm_apis)와 달리 프로젝트별로 다른 임계값이 없어 should 절이 프로젝트 개수만큼 늘어나지
 * 않고 match.any 하나로 끝난다.
 * @param scope 요청자의 스코핑 정보, SUPER_ADMIN이면 null
 * @returns Qdrant filter 객체
 */
function buildScopeFilter(scope: LogAuditScopeFilter | null): Record<string, unknown> {
  if (scope === null)
    return {};

  return {
    should: [
      { key: "project_id", match: { any: scope.allowed_project_ids } },
      {
        must: [
          { is_null: { key: "project_id" } },
          { key: "company_id", match: { value: scope.caller_company_id } },
        ],
      },
    ],
  };
}

/**
 * 권한 스코프(buildScopeFilter)에 헤더 선택(narrowProjectId/narrowCompanyId)을 AND로 결합해
 * 검색 범위를 좁힌다. 헤더 값은 클라이언트가 보내는 값이라 신뢰하지 않고, 항상 권한 필터와의
 * 교집합으로만 작용하게 한다 — narrow가 권한 밖 프로젝트/회사를 가리켜도 결과가 0건이 될 뿐
 * 권한을 벗어난 데이터가 노출되지는 않는다. narrowProjectId가 있으면 narrowCompanyId는 무시한다
 * (프로젝트가 회사보다 더 좁은 조건이므로 — client/AuditLogSearchPage.tsx도 이 우선순위로 보낸다).
 * @param scope 요청자의 스코핑 정보, SUPER_ADMIN이면 null
 * @param narrowProjectId 헤더에서 선택된 project_id(좁히기), 없으면 null
 * @param narrowCompanyId 헤더에서 선택된 company_id(좁히기), 없으면 null
 * @returns Qdrant filter 객체
 */
function buildFilter(
  scope: LogAuditScopeFilter | null,
  narrowProjectId: number | null,
  narrowCompanyId: number | null,
): Record<string, unknown> {
  const narrowCondition =
    narrowProjectId !== null
      ? { key: "project_id", match: { value: narrowProjectId } }
      : narrowCompanyId !== null
        ? { key: "company_id", match: { value: narrowCompanyId } }
        : null;

  const scopeFilter = buildScopeFilter(scope);
  if (narrowCondition === null)
    return scopeFilter;
  if (Object.keys(scopeFilter).length === 0)
    return { must: [narrowCondition] };
  // Qdrant는 must 배열 원소로 단일 조건뿐 아니라 중첩 Filter(scopeFilter의 should 절)도 허용한다.
  return { must: [scopeFilter, narrowCondition] };
}

/**
 * 질의를 임베딩한 뒤 gm_logs에서 프로젝트×회사 스코핑(+헤더 선택 좁히기)을 적용해 검색한다.
 * @param query 검색어
 * @param topK 반환할 최대 개수
 * @param scope 요청자의 스코핑 정보, SUPER_ADMIN이면 null
 * @param narrowProjectId 헤더에서 선택된 project_id(좁히기), 없으면 null
 * @param narrowCompanyId 헤더에서 선택된 company_id(좁히기), 없으면 null
 * @returns 유사도 내림차순 검색 결과
 */
export async function search(
  query: string,
  topK: number,
  scope: LogAuditScopeFilter | null,
  narrowProjectId: number | null,
  narrowCompanyId: number | null,
): Promise<LogAuditSearchHit[]> {
  const vector = await embed(`query: ${query}`);
  return searchLogsInStore(vector, topK, buildFilter(scope, narrowProjectId, narrowCompanyId));
}

/**
 * server/의 아웃박스 워커가 push한 감사 로그 1건을 gm_logs에 증분 반영한다.
 * @param item server/가 push한 완성된 감사 로그 데이터
 */
export async function reindex(item: LogAuditReindexPushBody): Promise<void> {
  await upsertOneLogAudit(item);
}
