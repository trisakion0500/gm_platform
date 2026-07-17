import { Request, Response, NextFunction } from 'express';
import * as apiService from '../services/api.service';
import { success, fail, formatDatetime } from '../utils/response';
import { APIResponseRow } from '../types';
import { ERROR_MAP } from '../constants/errors';
import { parsePositiveInt } from '../utils/validation';

function formatApiResponse(r: APIResponseRow) {
  return {
    ...r,
    created_at: formatDatetime(r.created_at),
    updated_at: formatDatetime(r.updated_at),
  };
}

/**
 * GET /api-responses/:api_response_id — API Response 파라미터 단건 조회 (전체 역할)
 * @author trisakion
 * @param req params: { api_response_id }
 * @param res 200 — API Response 파라미터 정보
 * @param next 오류 전달
 */
export async function getApiResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiResponseId = parsePositiveInt(req.params.api_response_id);
    if (apiResponseId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const apiResponse = await apiService.getApiResponse(apiResponseId, req.user!.role_code, req.user!.user_id);
    success(res, formatApiResponse(apiResponse));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api-responses/:api_response_id — API Response 파라미터 수정 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req params: { api_response_id }, body: { parameter_name?, parameter_label?, parameter_type?, code_group_id?, description?, display_order?, status? }
 * @param res 200 — 수정된 API Response 파라미터 정보
 * @param next 오류 전달
 */
export async function updateApiResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiResponseId = parsePositiveInt(req.params.api_response_id);
    if (apiResponseId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { parameter_name, parameter_label, parameter_type, code_group_id, description, display_order, status } = req.body;
    const apiResponse = await apiService.updateApiResponse(
      apiResponseId,
      parameter_name ?? null,
      parameter_label ?? null,
      parameter_type ?? null,
      code_group_id ?? null,
      description ?? null,
      display_order ?? null,
      status ?? null,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatApiResponse(apiResponse));
  } catch (err) {
    next(err);
  }
}
