import { Request, Response, NextFunction } from 'express';
import * as logAuditSearchService from '../services/logAuditSearch.service';
import { success, fail } from '../utils/response';
import { ERROR_MAP } from '../constants/errors';
import { parsePositiveInt } from '../utils/validation';

const MIN_TOP_K = 1;
const MAX_TOP_K = 20;

/**
 * GET /log-audit-search — 감사 로그 자연어 검색 (인증 필요, SUPER_ADMIN/DEVELOPER/APPROVER)
 * rag_server(POST /log-audits/search)를 대신 호출하는 프록시 — GET /log-audits와 동일한 역할
 * 제한을 따른다(원본 리소스 자체가 이미 3개 역할로 제한돼 있어 검색도 동일 범위). project_id×
 * company_id 스코핑은 logAuditSearch.service.ts가 호출자의 실제 user_role을 계산해 함께 전달한다.
 * 쿼리의 project_id/company_id(선택, 헤더에서 선택된 값)는 그 스코핑 결과를 넓히지 못하고
 * 좁히기만 한다 — rag_server가 항상 권한 필터와 AND로 결합한다(logAuditSearch.service.ts).
 * @author trisakion
 * @param req query: { q, top_k?, project_id?, company_id? }, req.user: authenticate가 채운 인증 컨텍스트
 * @param res 200 — [{ log_audit_id, table_name, target_id, target_name, action_type, project_name, created_by_name, created_at, embed_text, score }]
 * @param next 오류 전달
 * @returns void
 */
export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, top_k, project_id, company_id } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }

    let topK: number | null = null;
    if (top_k !== undefined) {
      const parsed = Number(top_k);
      if (!Number.isInteger(parsed) || parsed < MIN_TOP_K || parsed > MAX_TOP_K) {
        fail(res, ERROR_MAP.INVALID_VALUE);
        return;
      }
      topK = parsed;
    }

    let narrowProjectId: number | null = null;
    if (project_id !== undefined) {
      narrowProjectId = parsePositiveInt(project_id);
      if (narrowProjectId === null) {
        fail(res, ERROR_MAP.INVALID_FORMAT);
        return;
      }
    }

    let narrowCompanyId: number | null = null;
    if (company_id !== undefined) {
      narrowCompanyId = parsePositiveInt(company_id);
      if (narrowCompanyId === null) {
        fail(res, ERROR_MAP.INVALID_FORMAT);
        return;
      }
    }

    const results = await logAuditSearchService.searchLogAudits(
      q, topK, req.user!.role_code, req.user!.user_id, req.user!.company_id,
      narrowProjectId,
      narrowCompanyId,
    );
    success(res, results);
  } catch (err) {
    next(err);
  }
}
