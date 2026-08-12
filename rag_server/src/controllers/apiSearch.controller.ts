import { Request, Response, NextFunction } from "express";
import * as apiSearchService from "../services/apiSearch.service";
import { success, fail } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";
import { isReady } from "../readiness";
import { ProjectRoleFilter, ApiReindexPushBody } from "../types";

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;

/**
 * project_roles 배열 원소가 {project_id: number, role_code: number} 형태인지 확인한다.
 * @param value 검증할 값
 * @returns ProjectRoleFilter[] 형태이면 true
 */
function isValidProjectRoles(value: unknown): value is ProjectRoleFilter[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        v !== null &&
        typeof v === "object" &&
        typeof (v as Record<string, unknown>).project_id === "number" &&
        typeof (v as Record<string, unknown>).role_code === "number",
    )
  );
}

/**
 * POST /apis/search — API 정의 자연어 검색(project_id×role_code×api_stage 스코핑, docs/21_RAG_SERVER.md §10.2)
 * @param req body: { query: string, top_k?: number, project_roles: {project_id, role_code}[] | null }
 * @param res 200 — [{ api_id, project_id, project_name, api_name, api_code, endpoint, score }]
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

    // fail-closed(docs/21_RAG_SERVER.md §10.2 "스코핑" 6번) — project_roles가 요청에 아예 없거나
    // null/배열이 아니면 무제한으로 해석하지 않고 즉시 거부한다. null은 SUPER_ADMIN(무제한)을 명시적으로 뜻한다.
    const rawProjectRoles: unknown = req.body?.project_roles;
    if (rawProjectRoles === undefined || (rawProjectRoles !== null && !isValidProjectRoles(rawProjectRoles))) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const projectRoles = rawProjectRoles as ProjectRoleFilter[] | null;

    const results = await apiSearchService.search(query, topK, projectRoles);
    success(res, results);
  } catch (err) {
    next(err);
  }
}

/**
 * body가 ApiReindexPushBody 최소 형태를 갖췄는지 확인한다(server/ 내부 전용 엔드포인트라
 * 정교한 오류 코드 분리 없이 형태만 검증).
 * @param value 검증할 값
 * @returns ApiReindexPushBody 형태이면 true
 */
function isValidPushBody(value: unknown): value is ApiReindexPushBody {
  if (!value || typeof value !== "object")
    return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.api_id === "number" &&
    typeof v.project_id === "number" &&
    typeof v.project_name === "string" &&
    typeof v.api_code === "string" &&
    typeof v.api_name === "string" &&
    typeof v.endpoint === "string" &&
    typeof v.api_stage === "number" &&
    typeof v.status === "number" &&
    Array.isArray(v.requests) &&
    Array.isArray(v.responses)
  );
}

/**
 * POST /apis/reindex — server/의 아웃박스 워커가 push한 완성된 API 1건을 gm_apis에 증분 반영한다.
 * @param req body: ApiReindexPushBody
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

    await apiSearchService.reindex(req.body);
    success(res, []);
  } catch (err) {
    next(err);
  }
}
