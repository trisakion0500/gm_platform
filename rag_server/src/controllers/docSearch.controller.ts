import { Request, Response, NextFunction } from "express";
import * as docSearchService from "../services/docSearch.service";
import { success, fail } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";
import { isReady } from "../readiness";

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;

/**
 * POST /search — 문서 검색
 * @param req body: { query: string, top_k?: number }
 * @param res 200 — 검색 결과, 503 — 모델 로딩/재인덱싱 중, 400 — 잘못된 입력
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

    const results = await docSearchService.search(query, topK);
    success(res, results);
  } catch (err) {
    next(err);
  }
}
