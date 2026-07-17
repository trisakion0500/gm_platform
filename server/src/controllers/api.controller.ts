import { Request, Response, NextFunction } from 'express';
import * as apiService from '../services/api.service';
import { success, fail, formatDatetime } from '../utils/response';
import { APIRow, APIRequestRow, APIResponseRow } from '../types';
import { ERROR_MAP } from '../constants/errors';
import { parsePositiveInt, parsePagination } from '../utils/validation';

function formatApi(a: APIRow) {
  return {
    ...a,
    created_at: formatDatetime(a.created_at),
    updated_at: formatDatetime(a.updated_at),
  };
}

function formatApiRequest(r: APIRequestRow) {
  return {
    ...r,
    created_at: formatDatetime(r.created_at),
    updated_at: formatDatetime(r.updated_at),
  };
}

function formatApiResponse(r: APIResponseRow) {
  return {
    ...r,
    created_at: formatDatetime(r.created_at),
    updated_at: formatDatetime(r.updated_at),
  };
}

/**
 * POST /apis — API 생성 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req body: { project_id, api_code, api_name, endpoint, description?, is_required_approval?, response_view_type?, display_order? }
 * @param res 201 — 생성된 API 정보
 * @param next 오류 전달
 */
export async function createApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { project_id, api_code, api_name, endpoint, description, is_required_approval, response_view_type, display_order } = req.body;
    if (!project_id || !api_code || !api_name || !endpoint) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const projectId = parsePositiveInt(project_id);
    if (projectId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const api = await apiService.createApi(
      projectId,
      api_code,
      api_name,
      endpoint,
      description ?? null,
      is_required_approval ?? 0,
      response_view_type ?? 1,
      display_order ?? 0,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatApi(api), 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /apis — API 목록 조회 (전체 역할)
 * @author trisakion
 * @param req query: { project_id, page, page_size, status?, api_stage? }
 * @param res 200 — 페이지네이션 응답
 * @param next 오류 전달
 */
export async function getApiList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { project_id, status, api_stage, page, page_size } = req.query;
    if (!project_id || !page || !page_size) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const projectId = parsePositiveInt(project_id);
    if (projectId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const paged = parsePagination(page, page_size);
    if (!paged.ok) {
      fail(res, paged.error);
      return;
    }
    const statusNum = status !== undefined ? Number(status) : null;
    const apiStageNum = api_stage !== undefined ? Number(api_stage) : null;
    const result = await apiService.getApiList(
      projectId,
      statusNum,
      apiStageNum,
      paged.page,
      paged.pageSize,
      req.user!.role_code,
      req.user!.user_id,
    );
    success(res, {
      ...result,
      items: result.items.map(formatApi),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /apis/active — 사이드바 API 메뉴용 활성 API 전체 조회 (전체 역할, 페이지네이션 없음)
 * @author trisakion
 * @param req query: { project_id }
 * @param res 200 — 활성 API 목록 배열
 * @param next 오류 전달
 */
export async function getActiveApis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const projectId = parsePositiveInt(project_id);
    if (projectId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const items = await apiService.getActiveApis(projectId, req.user!.role_code, req.user!.user_id);
    success(res, items);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /apis/:api_id — API 단건 조회 (전체 역할)
 * @author trisakion
 * @param req params: { api_id }
 * @param res 200 — { api, requests, responses }
 * @param next 오류 전달
 */
export async function getApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiId = parsePositiveInt(req.params.api_id);
    if (apiId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const result = await apiService.getApi(apiId, req.user!.role_code, req.user!.user_id);
    success(res, {
      api: formatApi(result.api),
      requests: result.requests.map(formatApiRequest),
      responses: result.responses.map(formatApiResponse),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /apis/:api_id — API 수정 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req params: { api_id }, body: { api_code?, api_name?, endpoint?, description?, api_stage?, is_required_approval?, response_view_type?, display_order?, status? }
 * @param res 200 — 수정된 API 정보
 * @param next 오류 전달
 */
export async function updateApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiId = parsePositiveInt(req.params.api_id);
    if (apiId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { api_code, api_name, endpoint, description, api_stage, is_required_approval, response_view_type, display_order, status } = req.body;
    const api = await apiService.updateApi(
      apiId,
      api_code ?? null,
      api_name ?? null,
      endpoint ?? null,
      description ?? null,
      api_stage ?? null,
      is_required_approval ?? null,
      response_view_type ?? null,
      display_order ?? null,
      status ?? null,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatApi(api));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /apis/:api_id/requests — API Request 파라미터 생성 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req params: { api_id }, body: { parameter_name, parameter_label, parameter_type, component_type?, code_group_id?, is_required?, description?, display_order? }
 * @param res 201 — 생성된 API Request 파라미터 정보
 * @param next 오류 전달
 */
export async function createApiRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiId = parsePositiveInt(req.params.api_id);
    if (apiId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { parameter_name, parameter_label, parameter_type, component_type, code_group_id, is_required, description, display_order } = req.body;
    if (!parameter_name || !parameter_label || parameter_type === undefined) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const apiRequest = await apiService.createApiRequest(
      apiId,
      parameter_name,
      parameter_label,
      Number(parameter_type),
      component_type ?? 1,
      code_group_id ?? 0,
      is_required ?? 1,
      description ?? null,
      display_order ?? 0,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatApiRequest(apiRequest), 201);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /apis/:api_id/responses — API Response 파라미터 생성 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req params: { api_id }, body: { parameter_name, parameter_label, parameter_type, code_group_id?, description?, display_order? }
 * @param res 201 — 생성된 API Response 파라미터 정보
 * @param next 오류 전달
 */
export async function createApiResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiId = parsePositiveInt(req.params.api_id);
    if (apiId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { parameter_name, parameter_label, parameter_type, code_group_id, description, display_order } = req.body;
    if (!parameter_name || !parameter_label || parameter_type === undefined) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const apiResponse = await apiService.createApiResponse(
      apiId,
      parameter_name,
      parameter_label,
      Number(parameter_type),
      code_group_id ?? 0,
      description ?? null,
      display_order ?? 0,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatApiResponse(apiResponse), 201);
  } catch (err) {
    next(err);
  }
}
