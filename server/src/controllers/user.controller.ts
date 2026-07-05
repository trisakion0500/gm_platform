import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { success, fail, formatDatetime } from '../utils/response';
import { UserAdminRow } from '../types';
import { ERROR_MAP } from '../constants/errors';

const PHONE_NUMBER_MAX_LENGTH = 20; // 암호화 후 VARCHAR(255)에 저장되므로 평문은 넉넉히 제한
const DEPARTMENT_MAX_LENGTH = 100;
const POSITION_MAX_LENGTH = 100;

/**
 * UserAdminRow의 날짜 필드를 문자열로 변환한다.
 * @param u 사용자 DB 행
 * @returns 날짜 필드가 포맷된 응답 객체
 */
function formatUser(u: UserAdminRow) {
  return {
    ...u,
    last_login_at: formatDatetime(u.last_login_at),
    created_at:   formatDatetime(u.created_at),
    updated_at:   formatDatetime(u.updated_at),
  };
}

/**
 * GET /users — 사용자 목록 조회 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req query: { page, page_size, status?, company_id? }
 * @param res 200 — 페이지네이션 응답
 * @param next 오류 전달
 * @returns void
 */
export async function getUserList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, page_size, status, company_id } = req.query;
    if (!page || !page_size) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const pageNum     = Number(page);
    const pageSizeNum = Number(page_size);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    if (![20, 50, 100].includes(pageSizeNum)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const statusNum    = status     !== undefined ? Number(status)     : null;
    const companyIdNum = company_id !== undefined ? Number(company_id) : null;
    const result = await userService.getUserList(
      companyIdNum,
      statusNum,
      pageNum,
      pageSizeNum,
      req.user!.role_code,
      req.user!.company_id,
    );
    success(res, {
      ...result,
      items: result.items.map(formatUser),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/:user_id — 사용자 단건 조회 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req params: { user_id }
 * @param res 200 — 사용자 정보
 * @param next 오류 전달
 * @returns void
 */
export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.user_id);
    if (!Number.isInteger(userId) || userId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const user = await userService.getUser(userId, req.user!.role_code, req.user!.company_id);
    success(res, formatUser(user));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /users/:user_id — 사용자 수정 (SUPER_ADMIN)
 * @author trisakion
 * @param req params: { user_id }, body: { user_name?, email?, phone_number?, department?, position?, status? }
 * @param res 200 — 수정된 사용자 정보
 * @param next 오류 전달
 * @returns void
 */
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.user_id);
    if (!Number.isInteger(userId) || userId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { user_name, email, phone_number, department, position, status } = req.body;
    if (
      (phone_number && phone_number.length > PHONE_NUMBER_MAX_LENGTH) ||
      (department && department.length > DEPARTMENT_MAX_LENGTH) ||
      (position && position.length > POSITION_MAX_LENGTH)
    ) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const user = await userService.updateUser(
      userId,
      user_name    ?? null,
      email        ?? null,
      phone_number ?? null,
      department   ?? null,
      position     ?? null,
      status       ?? null,
      req.user!.role_code,
      req.user!.company_id,
      req.user!.user_id,
    );
    success(res, formatUser(user));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /users/:user_id/approve — 가입 승인 (SUPER_ADMIN)
 * @author trisakion
 * @param req params: { user_id }
 * @param res 200 — 빈 data
 * @param next 오류 전달
 * @returns void
 */
export async function approveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.user_id);
    if (!Number.isInteger(userId) || userId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    await userService.approveUser(userId, req.user!.role_code, req.user!.company_id, req.user!.user_id);
    success(res, null);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /users/:user_id/reject — 가입 반려 (SUPER_ADMIN)
 * @author trisakion
 * @param req params: { user_id }
 * @param res 200 — 빈 data
 * @param next 오류 전달
 * @returns void
 */
export async function rejectUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.user_id);
    if (!Number.isInteger(userId) || userId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    await userService.rejectUser(userId, req.user!.role_code, req.user!.company_id, req.user!.user_id);
    success(res, null);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /users/:user_id/reset-password — 비밀번호 강제 초기화 (SUPER_ADMIN)
 * @author trisakion
 * @param req params: { user_id }, body: { new_password }
 * @param res 200 — 빈 data
 * @param next 오류 전달
 * @returns void
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.user_id);
    if (!Number.isInteger(userId) || userId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { new_password } = req.body;
    if (!new_password) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    await userService.resetPassword(userId, new_password, req.user!.role_code, req.user!.company_id, req.user!.user_id);
    success(res, null);
  } catch (err) {
    next(err);
  }
}
