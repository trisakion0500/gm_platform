import { Request, Response, NextFunction } from 'express';
import * as internalService from '../services/internal.service';
import { success, fail } from '../utils/response';
import { ERROR_MAP } from '../constants/errors';

/**
 * GET /internal/apis — 전체 활성 API 스냅샷 조회 (rag_server 전용, ragKeyAuth로만 보호)
 * rag_server가 gm_apis 컬렉션 자가치유(부팅 시 비어있을 때)·npm run build-index-apis 전체
 * 재구축 시 pull하는 경로. GM Platform 사용자(JWT)와는 무관한 서비스 간 내부 호출이다.
 * @author trisakion
 * @param req 파라미터 없음
 * @param res 200 — ApiReindexPushBody[]
 * @param next 오류 전달
 * @returns void
 */
export async function getAllApis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const snapshots = await internalService.getAllActiveApiSnapshots();
    success(res, snapshots);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /internal/log-audits?page=&page_size= — 감사 로그 전체 스냅샷 페이지 조회 (rag_server 전용, ragKeyAuth로만 보호)
 * rag_server가 gm_logs 컬렉션 자가치유(부팅 시 비어있을 때)·npm run build-index-logs 전체 재구축 시
 * 페이지 단위로 순회하며 pull하는 경로(§Context "물량 문제 대응" — 한 번에 전체를 담지 않는다).
 * GET /apis(전 역할 20/30/50/100)와 무관한 내부 배치 전용 페이지 크기라 그 제약을 따르지 않는다.
 * @author trisakion
 * @param req query: { page, page_size }
 * @param res 200 — { total_count, items: LogAuditReindexPushBody[] }
 * @param next 오류 전달
 * @returns void
 */
export async function getAllLogAudits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, page_size } = req.query;
    const pageNum = Number(page);
    const pageSizeNum = Number(page_size);
    if (!Number.isInteger(pageNum) || pageNum < 1 || !Number.isInteger(pageSizeNum) || pageSizeNum < 1) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }

    const result = await internalService.getLogAuditSnapshotPage(pageNum, pageSizeNum);
    success(res, result);
  } catch (err) {
    next(err);
  }
}
