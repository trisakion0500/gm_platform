import { Request, Response, NextFunction } from 'express';
import * as apiService from '../services/api.service';
import { success, fail, formatDatetime } from '../utils/response';
import { APIRequestRow } from '../types';
import { ERROR_MAP } from '../constants/errors';

function formatApiRequest(r: APIRequestRow) {
  return {
    ...r,
    created_at: formatDatetime(r.created_at),
    updated_at: formatDatetime(r.updated_at),
  };
}

/**
 * GET /api-requests/:api_request_id — API Request 파라미터 단건 조회 (전체 역할)
 * @author trisakion
 * @param req params: { api_request_id }
 * @param res 200 — API Request 파라미터 정보
 * @param next 오류 전달
 */
export async function getApiRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiRequestId = Number(req.params.api_request_id);
    if (!Number.isInteger(apiRequestId) || apiRequestId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const apiRequest = await apiService.getApiRequest(apiRequestId);
    success(res, formatApiRequest(apiRequest));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api-requests/:api_request_id — API Request 파라미터 수정 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req params: { api_request_id }, body: { parameter_name?, parameter_label?, parameter_type?, component_type?, code_group_id?, is_required?, description?, display_order?, status? }
 * @param res 200 — 수정된 API Request 파라미터 정보
 * @param next 오류 전달
 */
export async function updateApiRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiRequestId = Number(req.params.api_request_id);
    if (!Number.isInteger(apiRequestId) || apiRequestId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { parameter_name, parameter_label, parameter_type, component_type, code_group_id, is_required, description, display_order, status } = req.body;
    const apiRequest = await apiService.updateApiRequest(
      apiRequestId,
      parameter_name ?? null,
      parameter_label ?? null,
      parameter_type ?? null,
      component_type ?? null,
      code_group_id ?? null,
      is_required ?? null,
      description ?? null,
      display_order ?? null,
      status ?? null,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatApiRequest(apiRequest));
  } catch (err) {
    next(err);
  }
}
