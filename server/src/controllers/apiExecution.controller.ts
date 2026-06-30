import { Request, Response, NextFunction } from 'express';
import * as service from '../services/apiExecution.service';
import { success, fail, formatDatetime } from '../utils/response';
import { APIExecutionRow } from '../types';
import { ERROR_MAP } from '../constants/errors';
import { ROLE } from '../constants/roles';

function formatApiExecution(e: APIExecutionRow) {
  return {
    ...e,
    ...(e.request_json !== undefined && { request_json: JSON.parse(e.request_json) }),
    ...(e.response_data !== undefined && { response_data: e.response_data ? JSON.parse(e.response_data) : null }),
    requested_at: formatDatetime(e.requested_at),
    approved_at: e.approved_at ? formatDatetime(e.approved_at) : null,
    executed_at: e.executed_at ? formatDatetime(e.executed_at) : null,
    updated_at: formatDatetime(e.updated_at),
  };
}

/**
 * POST /apis/:api_id/execute — API 실행 요청 (전체 역할, api_stage 조건 있음)
 * @author trisakion
 * @param req params: { api_id }, body: { request_json }
 * @param res 201 — 실행 이력 (즉시실행 시 최종 상태, 승인대기 시 PENDING)
 * @param next 오류 전달
 */
export async function executeApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiId = Number(req.params.api_id);
    if (!Number.isInteger(apiId) || apiId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { request_json } = req.body;
    if (request_json === undefined || request_json === null) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    if (typeof request_json !== 'object' || Array.isArray(request_json)) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const execution = await service.executeApi(
      apiId,
      req.user!.user_id,
      request_json,
      req.user!.role_code,
      req.user!.company_id,
    );
    success(res, formatApiExecution(execution), 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api-executions — 실행 이력 목록 조회 (전체 역할)
 * @author trisakion
 * @param req query: { project_id, page, page_size, api_id?, request_user_id?, status? }
 * @param res 200 — 페이지네이션 응답
 * @param next 오류 전달
 */
export async function getApiExecutionList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { project_id, page, page_size, api_id, request_user_id, status } = req.query;
    if (!project_id || !page || !page_size) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const projectId = Number(project_id);
    const pageNum = Number(page);
    const pageSizeNum = Number(page_size);
    if (!Number.isInteger(projectId) || projectId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    if (![20, 50, 100].includes(pageSizeNum)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }

    const apiIdNum = api_id !== undefined ? Number(api_id) : null;
    const statusNum = status !== undefined ? Number(status) : null;

    // OPERATOR는 본인 요청 건만 조회 가능 — request_user_id 강제 적용
    const requestUserIdNum = req.user!.role_code === ROLE.OPERATOR
      ? req.user!.user_id
      : (request_user_id !== undefined ? Number(request_user_id) : null);

    const result = await service.getApiExecutionList(
      projectId, apiIdNum, requestUserIdNum, statusNum,
      pageNum, pageSizeNum, req.user!.role_code, req.user!.company_id,
    );
    success(res, {
      ...result,
      items: result.items.map(formatApiExecution),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api-executions/pending — 승인 대기 목록 (SUPER_ADMIN, DEVELOPER, APPROVER)
 * @author trisakion
 * @param req query: { project_id, page, page_size }
 * @param res 200 — 페이지네이션 응답
 * @param next 오류 전달
 */
export async function getApiExecutionPending(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { project_id, page, page_size } = req.query;
    if (!project_id || !page || !page_size) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const projectId = Number(project_id);
    const pageNum = Number(page);
    const pageSizeNum = Number(page_size);
    if (!Number.isInteger(projectId) || projectId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    if (![20, 50, 100].includes(pageSizeNum)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const result = await service.getApiExecutionPending(
      projectId, pageNum, pageSizeNum, req.user!.role_code, req.user!.company_id,
    );
    success(res, {
      ...result,
      items: result.items.map(formatApiExecution),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api-executions/:api_execution_id — 실행 이력 단건 조회 (전체 역할)
 * @author trisakion
 * @param req params: { api_execution_id }
 * @param res 200 — 실행 이력 상세
 * @param next 오류 전달
 */
export async function getApiExecution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const executionId = Number(req.params.api_execution_id);
    if (!Number.isInteger(executionId) || executionId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const execution = await service.getApiExecution(
      executionId, req.user!.role_code, req.user!.user_id, req.user!.company_id,
    );
    success(res, formatApiExecution(execution));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api-executions/:api_execution_id/approve — 실행 승인 (SUPER_ADMIN, DEVELOPER, APPROVER)
 * @author trisakion
 * @param req params: { api_execution_id }
 * @param res 200 — HTTP 호출 후 최종 실행 이력
 * @param next 오류 전달
 */
export async function approveApiExecution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const executionId = Number(req.params.api_execution_id);
    if (!Number.isInteger(executionId) || executionId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const execution = await service.approveApiExecution(
      executionId, req.user!.user_id, req.user!.role_code, req.user!.company_id,
    );
    success(res, formatApiExecution(execution));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api-executions/:api_execution_id/reject — 실행 반려 (SUPER_ADMIN, DEVELOPER, APPROVER)
 * @author trisakion
 * @param req params: { api_execution_id }, body: { reject_reason }
 * @param res 200 — 반려된 실행 이력
 * @param next 오류 전달
 */
export async function rejectApiExecution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const executionId = Number(req.params.api_execution_id);
    if (!Number.isInteger(executionId) || executionId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { reject_reason } = req.body;
    if (!reject_reason) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const execution = await service.rejectApiExecution(executionId, req.user!.user_id, reject_reason);
    success(res, formatApiExecution(execution));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api-executions/:api_execution_id/cancel — 실행 취소 (요청자 본인)
 * @author trisakion
 * @param req params: { api_execution_id }, body: { reject_reason }
 * @param res 200 — 취소된 실행 이력
 * @param next 오류 전달
 */
export async function cancelApiExecution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const executionId = Number(req.params.api_execution_id);
    if (!Number.isInteger(executionId) || executionId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { reject_reason } = req.body;
    if (!reject_reason) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const execution = await service.cancelApiExecution(executionId, req.user!.user_id, reject_reason);
    success(res, formatApiExecution(execution));
  } catch (err) {
    next(err);
  }
}
