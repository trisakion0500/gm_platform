import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../types';
import { ERROR_MAP } from '../constants/errors';
import { ROLE } from '../constants/roles';
import logger from '../utils/logger';
import * as logAuditService from './logAudit.service';

/** rag_server 응답 봉투. 응답 형식: { result, message, data: [...] } (docSearch.service.ts/apiSearch.service.ts와 동일 패턴) */
interface RagEnvelope<T> {
  result: number;
  message: string;
  data: T;
}

/** rag_server POST /log-audits/search의 scope 필터 — rag_server/src/types/index.ts의 LogAuditScopeFilter와 동일 계약 */
interface LogAuditScopeFilter {
  allowed_project_ids: number[];
  caller_company_id: number;
}

/** rag_server의 감사 로그 검색 결과 한 건 */
export interface LogAuditSearchHit {
  log_audit_id: number;
  table_name: string;
  target_id: string;
  target_name: string | null;
  action_type: number;
  project_name: string | null;
  created_by_name: string | null;
  created_at: string;
  score: number;
}

/**
 * 호출자의 스코핑 정보를 계산한다. SUPER_ADMIN이면 null(무제한), 그 외에는 logAudit.service.ts의
 * resolveAllowedProjectIds()(GET /log-audits와 완전히 동일한 스코핑 규칙, role_code<=30 실제 배정)를
 * 재사용해 콤마 문자열을 숫자 배열로 변환한다.
 * @author trisakion
 * @param callerRoleCode 요청자 역할 코드
 * @param callerUserId 요청자 user_id
 * @param callerCompanyId 요청자 company_id
 * @returns 스코핑 정보, SUPER_ADMIN이면 null
 */
async function resolveScope(
  callerRoleCode: number,
  callerUserId: number,
  callerCompanyId: number,
): Promise<LogAuditScopeFilter | null> {
  if (callerRoleCode === ROLE.SUPER_ADMIN)
    return null;

  const csv = await logAuditService.resolveAllowedProjectIds(callerUserId);
  const allowedProjectIds = csv.length > 0 ? csv.split(',').map(Number) : [];
  return { allowed_project_ids: allowedProjectIds, caller_company_id: callerCompanyId };
}

/**
 * rag_server(POST /log-audits/search)에 감사 로그 검색을 위임한다. apiSearch.service.ts와 동일하게
 * 실패 사유를 구분하지 않고 전부 RAG_SERVICE_UNAVAILABLE(503)로 통일한다.
 * @author trisakion
 * @param query 검색어 (자연어)
 * @param topK 반환할 최대 개수 (null이면 rag_server 기본값 5 적용)
 * @param callerRoleCode 요청자 역할 코드
 * @param callerUserId 요청자 user_id
 * @param callerCompanyId 요청자 company_id
 * @returns 유사도 내림차순 검색 결과
 */
export async function searchLogAudits(
  query: string,
  topK: number | null,
  callerRoleCode: number,
  callerUserId: number,
  callerCompanyId: number,
): Promise<LogAuditSearchHit[]> {
  const scope = await resolveScope(callerRoleCode, callerUserId, callerCompanyId);

  try {
    const headers = env.rag.apiKey ? { 'X-API-Key': env.rag.apiKey } : undefined;
    const res = await axios.post<RagEnvelope<LogAuditSearchHit[]>>(
      `${env.rag.baseUrl}/log-audits/search`,
      { query, top_k: topK ?? undefined, scope },
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
    logger.error(`rag_server(gm_logs) 연동 실패: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined);
    throw new AppError(
      ERROR_MAP.RAG_SERVICE_UNAVAILABLE.code,
      ERROR_MAP.RAG_SERVICE_UNAVAILABLE.message,
      ERROR_MAP.RAG_SERVICE_UNAVAILABLE.httpStatus,
      { cause: err },
    );
  }
}
