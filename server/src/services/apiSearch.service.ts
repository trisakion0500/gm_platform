import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../types';
import { ERROR_MAP } from '../constants/errors';
import { ROLE } from '../constants/roles';
import logger from '../utils/logger';
import * as userRoleService from './userRole.service';

/** rag_server 응답 봉투. 응답 형식: { result, message, data: [...] } (docSearch.service.ts와 동일 패턴) */
interface RagEnvelope<T> {
  result: number;
  message: string;
  data: T;
}

/** rag_server POST /apis/search의 project_roles 필터 항목 — rag_server/src/types/index.ts의 ProjectRoleFilter와 동일 계약 */
interface ProjectRoleFilter {
  project_id: number;
  role_code: number;
}

/** rag_server의 API 정의 검색 결과 한 건 */
export interface ApiSearchHit {
  api_id: number;
  project_id: number;
  project_name: string;
  api_name: string;
  api_code: string;
  endpoint: string;
  score: number;
}

/**
 * 호출자가 실제 활성 배정을 가진 {project_id, role_code} 목록을 계산한다.
 * logAudit.service.ts의 resolveAllowedProjectIds()와 달리 role_code<=30 상한을 두지 않는다 —
 * GET /apis가 전 역할(OPERATOR 포함) 조회 가능이므로 이 검색도 동일 범위를 따른다.
 * SP_GET_USER_ROLE_LIST를 새 SP 없이 그대로 재사용한다(userRole.service.ts, GET /user-roles와 동일 경로).
 * @author trisakion
 * @param callerUserId 요청자 user_id
 * @returns 활성 배정 {project_id, role_code}[] (없으면 빈 배열)
 */
async function resolveApiProjectRoles(callerUserId: number): Promise<ProjectRoleFilter[]> {
  const roles = await userRoleService.getUserRoleList(callerUserId, null, null, 1, null);
  return roles.map((r) => ({ project_id: r.project_id, role_code: r.role_code }));
}

/**
 * rag_server(POST /apis/search)에 API 정의 검색을 위임한다. docSearch.service.ts의 searchDocs()와
 * 동일하게 실패 사유를 구분하지 않고 전부 RAG_SERVICE_UNAVAILABLE(503)로 통일한다.
 * 헤더에서 선택된 프로젝트 하나로 강제 스코핑한다(다른 프로젝트 종속 화면과 동일 원칙) — SUPER_ADMIN도
 * 예외 없이 projectId로 좁혀서 검색하고, 그 안에서는 role_code=SUPER_ADMIN(10)이 모든 api_stage를
 * 통과시켜 무제한과 동일한 효과를 낸다. project_roles는 여기서 계산해 넘긴다 — rag_server는
 * JWT/role을 모르고 이 값을 그대로 신뢰한다(log_audit DB가 server/가 계산한 스코프를 그대로
 * 신뢰하는 기존 패턴과 동일한 신뢰 경계).
 * @author trisakion
 * @param query 검색어 (자연어)
 * @param projectId 검색을 좁힐 대상 프로젝트 ID (헤더에서 선택된 프로젝트)
 * @param topK 반환할 최대 개수 (null이면 rag_server 기본값 5 적용)
 * @param callerRoleCode 요청자 역할 코드
 * @param callerUserId 요청자 user_id
 * @returns 유사도 내림차순 검색 결과 (호출자가 projectId에 실제 활성 배정이 없으면 빈 배열)
 */
export async function searchApis(
  query: string,
  projectId: number,
  topK: number | null,
  callerRoleCode: number,
  callerUserId: number,
): Promise<ApiSearchHit[]> {
  const projectRoles: ProjectRoleFilter[] =
    callerRoleCode === ROLE.SUPER_ADMIN
      ? [{ project_id: projectId, role_code: ROLE.SUPER_ADMIN }]
      : (await resolveApiProjectRoles(callerUserId)).filter((r) => r.project_id === projectId);

  try {
    const headers = env.rag.apiKey ? { 'X-API-Key': env.rag.apiKey } : undefined;
    const res = await axios.post<RagEnvelope<ApiSearchHit[]>>(
      `${env.rag.baseUrl}/apis/search`,
      { query, top_k: topK ?? undefined, project_roles: projectRoles },
      { timeout: env.apiExecutionTimeoutMs, headers },
    );
    if (res.data.result !== 0) {
      throw new AppError(
        ERROR_MAP.RAG_SERVICE_UNAVAILABLE.code,
        ERROR_MAP.RAG_SERVICE_UNAVAILABLE.message,
        ERROR_MAP.RAG_SERVICE_UNAVAILABLE.httpStatus,
        { cause: new Error(`rag_server result=${res.data.result} message=${res.data.message}`) },
      );
    }
    return res.data.data;
  } catch (err) {
    if (err instanceof AppError)
      throw err;
    // err 객체 자체·JSON.stringify(err)는 절대 로깅하지 않는다 — axios 에러는 config.headers(X-API-Key 평문)를 담고 있다. err.stack만 사용.
    logger.error(`rag_server(gm_apis) 연동 실패: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined);
    throw new AppError(
      ERROR_MAP.RAG_SERVICE_UNAVAILABLE.code,
      ERROR_MAP.RAG_SERVICE_UNAVAILABLE.message,
      ERROR_MAP.RAG_SERVICE_UNAVAILABLE.httpStatus,
      { cause: err },
    );
  }
}
