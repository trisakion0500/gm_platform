import { ApiReindexPushBody, LogAuditReindexPushBody, ProjectRow, APIRow } from '../types';
import * as projectService from './project.service';
import * as apiService from './api.service';
import * as logAuditDb from '../db/logAudit.db';
import { buildEmbedText } from '../utils/auditDiffText';
import { formatDatetime } from '../utils/response';

// SUPER_ADMIN 컨텍스트로 전체 스코핑을 우회하는 내부 배치 전용 상수 — audit.service.ts의
// resolveApiScope()가 쓰는 callSP('SP_GET_API', [apiId, 10, 0]) 관례와 동일(role_code=10이면
// SP 내부에서 user_id 자체를 안 보므로 0은 순수 placeholder).
const SYSTEM_ROLE_CODE = 10;
const SYSTEM_USER_ID = 0;
// 내부 배치 전용 페이지 크기 — 공개 API의 20/30/50/100 제약(컨트롤러 레벨 검증)과 무관하게
// 이 서비스가 db 함수를 직접 호출하므로 자유롭게 정할 수 있다. 100이면 대부분의 경우 1페이지에 끝난다.
const PAGE_SIZE = 100;

/**
 * 활성(status=1) 프로젝트 전체를 페이지네이션을 직접 순회해 모은다.
 * @returns 활성 프로젝트 전체 목록
 */
async function fetchAllActiveProjects(): Promise<ProjectRow[]> {
  const all: ProjectRow[] = [];
  let page = 1;
  while (true) {
    const { items, total_count } = await projectService.getProjectList(null, 1, page, PAGE_SIZE, SYSTEM_ROLE_CODE, SYSTEM_USER_ID);
    all.push(...items);
    if (all.length >= total_count || items.length === 0)
      break;
    page++;
  }
  return all;
}

/**
 * 프로젝트 하나의 활성(status=1) API 전체를 페이지네이션을 직접 순회해 모은다.
 * @param projectId 대상 프로젝트 ID
 * @returns 활성 API 전체 목록
 */
async function fetchAllActiveApis(projectId: number): Promise<APIRow[]> {
  const all: APIRow[] = [];
  let page = 1;
  while (true) {
    const { items, total_count } = await apiService.getApiList(projectId, 1, null, page, PAGE_SIZE, SYSTEM_ROLE_CODE, SYSTEM_USER_ID);
    all.push(...items);
    if (all.length >= total_count || items.length === 0)
      break;
    page++;
  }
  return all;
}

/**
 * 전체 활성 프로젝트의 활성 API를 SUPER_ADMIN 컨텍스트로 조합해 rag_server가 요구하는
 * 완성된 스냅샷 형태로 반환한다. GET /internal/apis(rag_server 전용 pull 경로)가 이 함수를 그대로 응답한다.
 * SP_GET_PROJECT_LIST(role_code=10) → 프로젝트별 SP_GET_API_LIST → API별 SP_GET_API 순으로
 * 기존 서비스 함수를 재사용할 뿐 새 SP는 없다(docs/21_RAG_SERVER.md §10.2 "백필/자가치유 경로").
 * @author trisakion
 * @returns 전체 활성 API 스냅샷
 */
export async function getAllActiveApiSnapshots(): Promise<ApiReindexPushBody[]> {
  const projects = await fetchAllActiveProjects();
  const results: ApiReindexPushBody[] = [];

  for (const project of projects) {
    const apis = await fetchAllActiveApis(project.project_id);
    for (const apiRow of apis) {
      const { api, requests, responses } = await apiService.getApi(apiRow.api_id, SYSTEM_ROLE_CODE, SYSTEM_USER_ID);
      results.push({
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
      });
    }
  }

  return results;
}

/**
 * RAG Phase 3 전체 스냅샷(부팅 자가치유·build-index-logs) 전용 페이지 조회. GET /internal/log-audits가
 * 이 함수를 그대로 응답한다. logAuditDb.getLogAuditSyncSnapshotPage()(before_json/after_json 포함,
 * 접근제어 없음)로 원본 행을 조회한 뒤, 각 행을 auditDiffText.ts로 diff 문장화해 embed_text를 만들고
 * before_json/after_json 원본은 응답에서 완전히 제거한다 — rag_server는 diff 원문을 절대 받지 않는다(MSA 경계).
 * @author trisakion
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기
 * @returns { total_count, items }
 */
export async function getLogAuditSnapshotPage(
  page: number,
  pageSize: number,
): Promise<{ total_count: number; items: LogAuditReindexPushBody[] }> {
  const { total_count, items } = await logAuditDb.getLogAuditSyncSnapshotPage(page, pageSize);
  return {
    total_count,
    items: items.map((row) => ({
      log_audit_id: row.log_audit_id,
      company_id: row.company_id,
      project_id: row.project_id,
      project_name: row.project_name,
      table_name: row.table_name,
      target_id: row.target_id,
      target_name: row.target_name,
      action_type: row.action_type,
      created_by_name: row.created_by_name,
      created_at: formatDatetime(row.created_at)!,
      embed_text: buildEmbedText(row),
    })),
  };
}
