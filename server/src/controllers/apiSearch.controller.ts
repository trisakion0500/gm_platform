import { Request, Response, NextFunction } from 'express';
import * as apiSearchService from '../services/apiSearch.service';
import { success, fail } from '../utils/response';
import { ERROR_MAP } from '../constants/errors';

const MIN_TOP_K = 1;
const MAX_TOP_K = 20;

/**
 * GET /api-search — API 정의(api/api_request/api_response) 자연어 검색 (인증 필요, 전체 역할)
 * rag_server(POST /apis/search)를 대신 호출하는 프록시 — 프로젝트×역할×스테이지 스코핑은
 * apiSearch.service.ts가 호출자의 실제 user_role을 계산해 함께 전달한다.
 * @author trisakion
 * @param req query: { q, top_k? }, req.user: authenticate가 채운 인증 컨텍스트
 * @param res 200 — [{ api_id, project_id, project_name, api_name, api_code, endpoint, score }]
 * @param next 오류 전달
 * @returns void
 */
export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, top_k } = req.query;
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

    const results = await apiSearchService.searchApis(q, topK, req.user!.role_code, req.user!.user_id);
    success(res, results);
  } catch (err) {
    next(err);
  }
}
