import { Request, Response, NextFunction } from 'express';
import * as codeGroupService from '../services/codeGroup.service';
import { success, fail, formatDatetime } from '../utils/response';
import { CodeGroupRow } from '../types';
import { ERROR_MAP } from '../constants/errors';
import { parsePositiveInt } from '../utils/validation';

function formatCodeGroup(g: CodeGroupRow) {
  return {
    ...g,
    created_at: formatDatetime(g.created_at),
    updated_at: formatDatetime(g.updated_at),
  };
}

/**
 * POST /code-groups — 코드 그룹 생성 (SUPER_ADMIN)
 * @author trisakion
 * @param req body: { project_id, code_group_code, code_group_name, description? }
 * @param res 201 — 생성된 코드 그룹 정보
 * @param next 오류 전달
 */
export async function createCodeGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { project_id, code_group_code, code_group_name, description } = req.body;
    if (!project_id || !code_group_code || !code_group_name) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const projectId = parsePositiveInt(project_id);
    if (projectId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const codeGroup = await codeGroupService.createCodeGroup(
      projectId,
      code_group_code,
      code_group_name,
      description ?? null,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatCodeGroup(codeGroup), 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /code-groups?project_id=&status= — 코드 그룹 목록 조회 (전 역할)
 * @author trisakion
 * @param req query: { project_id, status? }
 * @param res 200 — 코드 그룹 목록
 * @param next 오류 전달
 */
export async function getCodeGroupList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { project_id, status } = req.query;
    if (!project_id) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const projectId = parsePositiveInt(project_id);
    if (projectId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const statusNum = status !== undefined ? Number(status) : null;
    const items = await codeGroupService.getCodeGroupList(projectId, statusNum);
    success(res, { items: items.map(formatCodeGroup) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /code-groups/:code_group_id — 코드 그룹 단건 조회 (전 역할)
 * @author trisakion
 * @param req params: { code_group_id }
 * @param res 200 — 코드 그룹 정보
 * @param next 오류 전달
 */
export async function getCodeGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const codeGroupId = parsePositiveInt(req.params.code_group_id);
    if (codeGroupId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const codeGroup = await codeGroupService.getCodeGroup(codeGroupId);
    success(res, formatCodeGroup(codeGroup));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /code-groups/:code_group_id — 코드 그룹 수정 (SUPER_ADMIN)
 * @author trisakion
 * @param req params: { code_group_id }, body: { code_group_name?, description?, status? }
 * @param res 200 — 수정된 코드 그룹 정보
 * @param next 오류 전달
 */
export async function updateCodeGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const codeGroupId = parsePositiveInt(req.params.code_group_id);
    if (codeGroupId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { code_group_name, description, status } = req.body;
    const codeGroup = await codeGroupService.updateCodeGroup(
      codeGroupId,
      code_group_name ?? null,
      description ?? null,
      status ?? null,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatCodeGroup(codeGroup));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /code-groups/:code_group_id/active-items — 활성 코드 아이템 조회 (전 역할)
 * @author trisakion
 * @param req params: { code_group_id }
 * @param res 200 — { items: [{ code_value, code_name }] }
 * @param next 오류 전달
 */
export async function getActiveCodeItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const codeGroupId = parsePositiveInt(req.params.code_group_id);
    if (codeGroupId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const items = await codeGroupService.getActiveCodeItems(codeGroupId);
    success(res, { items });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /code-groups/active-with-items?project_id= — 프로젝트의 활성 코드그룹+아이템 일괄 조회 (전 역할)
 * @author trisakion
 * @param req query: { project_id }
 * @param res 200 — { items: [{ code_group_id, code_group_code, code_group_name, items: [{code_value, code_name}] }] }
 * @param next 오류 전달
 */
export async function getActiveCodeGroupsWithItems(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const items = await codeGroupService.getActiveCodeGroupsWithItems(projectId);
    success(res, { items });
  } catch (err) {
    next(err);
  }
}
