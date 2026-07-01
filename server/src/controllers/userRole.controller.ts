import { Request, Response, NextFunction } from 'express';
import * as userRoleService from '../services/userRole.service';
import { success, fail, formatDatetime } from '../utils/response';
import { UserRoleRow } from '../types';
import { ERROR_MAP } from '../constants/errors';

/**
 * UserRoleRow의 날짜 필드를 문자열로 변환한다.
 * @param ur User Role DB 행
 * @returns 날짜 필드가 포맷된 응답 객체
 */
function formatUserRole(ur: UserRoleRow) {
  return {
    ...ur,
    created_at: formatDatetime(ur.created_at),
    updated_at: formatDatetime(ur.updated_at),
  };
}

/**
 * GET /user-roles — User Role 목록 조회 (SUPER_ADMIN: 전체, DEVELOPER: 본인 회사 스코핑)
 * @author trisakion
 * @param req query: { user_id?, project_id?, role_code?, status? }
 * @param res 200 — User Role 목록
 * @param next 오류 전달
 * @returns void
 */
export async function getUserRoleList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user_id, project_id, role_code, status } = req.query;
    const userIdNum    = user_id    !== undefined ? Number(user_id)    : null;
    const projectIdNum = project_id !== undefined ? Number(project_id) : null;
    const roleCodeNum  = role_code  !== undefined ? Number(role_code)  : null;
    const statusNum    = status     !== undefined ? Number(status)     : null;
    const companyId    = req.user!.role_code === 10 ? null : req.user!.company_id;
    const items = await userRoleService.getUserRoleList(userIdNum, projectIdNum, roleCodeNum, statusNum, companyId);
    success(res, items.map(formatUserRole));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /user-roles — User Role 등록 (SUPER_ADMIN)
 * @author trisakion
 * @param req body: { user_id, project_id, role_code }
 * @param res 201 — 등록된 User Role 정보
 * @param next 오류 전달
 * @returns void
 */
export async function createUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user_id, project_id, role_code } = req.body;
    if (!user_id || !project_id || !role_code) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const userRole = await userRoleService.createUserRole(Number(user_id), Number(project_id), Number(role_code), req.user!.user_id);
    success(res, formatUserRole(userRole), 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /user-roles/:user_id/:project_id — User Role 수정 (SUPER_ADMIN)
 * @author trisakion
 * @param req params: { user_id, project_id }, body: { role_code?, status? }
 * @param res 200 — 수정된 User Role 정보
 * @param next 오류 전달
 * @returns void
 */
export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId    = Number(req.params.user_id);
    const projectId = Number(req.params.project_id);
    if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(projectId) || projectId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { role_code, status } = req.body;
    const userRole = await userRoleService.updateUserRole(
      userId,
      projectId,
      role_code ?? null,
      status    ?? null,
      req.user!.user_id,
    );
    success(res, formatUserRole(userRole));
  } catch (err) {
    next(err);
  }
}
