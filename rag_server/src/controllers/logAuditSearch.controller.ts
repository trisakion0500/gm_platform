import { Request, Response, NextFunction } from "express";
import * as logAuditSearchService from "../services/logAuditSearch.service";
import { success, fail } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";
import { isReady } from "../readiness";
import { LogAuditScopeFilter, LogAuditReindexPushBody } from "../types";

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;

/**
 * body.scope가 LogAuditScopeFilter 형태(또는 null)인지 확인한다.
 * @param value 검증할 값
 * @returns LogAuditScopeFilter | null 형태이면 true
 */
function isValidScope(value: unknown): value is LogAuditScopeFilter | null {
  if (value === null)
    return true;
  if (value === undefined || typeof value !== "object")
    return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.allowed_project_ids) &&
    v.allowed_project_ids.every((id) => typeof id === "number") &&
    typeof v.caller_company_id === "number"
  );
}

/**
 * body.project_id/company_id(헤더 선택 좁히기용, 둘 다 선택)가 number 또는 null/undefined인지 확인한다.
 * @param value 검증할 값
 * @returns number | null | undefined 형태이면 true
 */
function isValidNarrowId(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || typeof value === "number";
}

/**
 * POST /log-audits/search — 감사 로그 자연어 검색(project_id×company_id 스코핑, docs/21_RAG_SERVER.md §10.3)
 * @param req body: { query: string, top_k?: number, scope: {allowed_project_ids, caller_company_id} | null,
 *                     project_id?: number | null, company_id?: number | null }
 * @param res 200 — [{ log_audit_id, table_name, target_id, target_name, action_type, project_name, created_by_name, created_at, embed_text, score }]
 * @param next 오류 전달
 * @returns void
 */
export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isReady()) {
      fail(res, ERROR_MAP.MODEL_LOADING);
      return;
    }

    const query = req.body?.query;
    if (typeof query !== "string" || query.trim().length === 0) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }

    let topK = DEFAULT_TOP_K;
    if (req.body?.top_k !== undefined) {
      const parsed = Number(req.body.top_k);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_TOP_K) {
        fail(res, ERROR_MAP.INVALID_VALUE);
        return;
      }
      topK = parsed;
    }

    // fail-closed(apiSearch.controller.ts와 동일 원칙) — scope 필드가 요청에 아예 없으면 즉시 거부한다.
    // null은 SUPER_ADMIN(무제한)을 명시적으로 뜻한다.
    const rawScope: unknown = req.body?.scope;
    if (rawScope === undefined || !isValidScope(rawScope)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }

    // 헤더 선택 좁히기 — 둘 다 선택 필드(없으면 "전체", scope 그대로). project_id/company_id 둘 다
    // 없거나 형식이 틀리면 400, 있으면 buildFilter가 scope와 AND로 결합한다(logAuditSearch.service.ts).
    const rawProjectId: unknown = req.body?.project_id;
    const rawCompanyId: unknown = req.body?.company_id;
    if (!isValidNarrowId(rawProjectId) || !isValidNarrowId(rawCompanyId)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const narrowProjectId = typeof rawProjectId === "number" ? rawProjectId : null;
    const narrowCompanyId = typeof rawCompanyId === "number" ? rawCompanyId : null;

    const results = await logAuditSearchService.search(query, topK, rawScope, narrowProjectId, narrowCompanyId);
    success(res, results);
  } catch (err) {
    next(err);
  }
}

/**
 * body가 LogAuditReindexPushBody 최소 형태를 갖췄는지 확인한다(server/ 내부 전용 엔드포인트라
 * 정교한 오류 코드 분리 없이 형태만 검증).
 * @param value 검증할 값
 * @returns LogAuditReindexPushBody 형태이면 true
 */
function isValidPushBody(value: unknown): value is LogAuditReindexPushBody {
  if (!value || typeof value !== "object")
    return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.log_audit_id === "number" &&
    typeof v.company_id === "number" &&
    (v.project_id === null || typeof v.project_id === "number") &&
    typeof v.table_name === "string" &&
    typeof v.target_id === "string" &&
    typeof v.action_type === "number" &&
    typeof v.created_at === "string" &&
    typeof v.embed_text === "string"
  );
}

/**
 * POST /log-audits/reindex — server/의 아웃박스 워커가 push한 완성된 감사 로그 1건을 gm_logs에 증분 반영한다.
 * @param req body: LogAuditReindexPushBody
 * @param res 200 — data: []
 * @param next 오류 전달
 * @returns void
 */
export async function reindex(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isValidPushBody(req.body)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }

    await logAuditSearchService.reindex(req.body);
    success(res, []);
  } catch (err) {
    next(err);
  }
}
