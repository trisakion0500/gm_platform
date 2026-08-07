import { Request, Response, NextFunction } from 'express';
import * as docSearchService from '../services/docSearch.service';
import { success, fail } from '../utils/response';
import { ERROR_MAP } from '../constants/errors';

const MIN_TOP_K = 1;
const MAX_TOP_K = 20;

/**
 * GET /doc-search — 설계 문서(docs/*.md, README.md) 자연어 검색 (인증 필요, 전체 역할)
 * rag_server(POST /search)를 대신 호출하는 프록시 — GM Platform 인증 경계(authenticate) 뒤에서만 노출한다.
 * @author trisakion
 * @param req query: { q, top_k? }
 * @param res 200 — [{ file, heading, text, score }]
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

    const results = await docSearchService.searchDocs(q, topK);
    success(res, results);
  } catch (err) {
    next(err);
  }
}
