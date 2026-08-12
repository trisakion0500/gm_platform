import { Request, Response, NextFunction } from 'express';
import * as internalService from '../services/internal.service';
import { success } from '../utils/response';

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
