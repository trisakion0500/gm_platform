import { Request, Response, NextFunction } from 'express';
import * as codeItemService from '../services/codeItem.service';
import { success, fail, formatDatetime } from '../utils/response';
import { CodeItemRow } from '../types';
import { ERROR_MAP } from '../constants/errors';
import { parsePositiveInt } from '../utils/validation';

function formatCodeItem(i: CodeItemRow) {
  return {
    ...i,
    created_at: formatDatetime(i.created_at),
    updated_at: formatDatetime(i.updated_at),
  };
}

/**
 * POST /code-items — 코드 아이템 생성 (SUPER_ADMIN)
 * @author trisakion
 * @param req body: { code_group_id, code_value, code_name, description?, display_order }
 * @param res 201 — 생성된 코드 아이템 정보
 * @param next 오류 전달
 */
export async function createCodeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code_group_id, code_value, code_name, description, display_order } = req.body;
    if (!code_group_id || !code_value || !code_name || display_order === undefined) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const codeGroupId = parsePositiveInt(code_group_id);
    const displayOrder = Number(display_order);
    if (codeGroupId === null || !Number.isInteger(displayOrder) || displayOrder < 0) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const codeItem = await codeItemService.createCodeItem(
      codeGroupId,
      code_value,
      code_name,
      description ?? null,
      displayOrder,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatCodeItem(codeItem), 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /code-items?code_group_id=&status= — 코드 아이템 목록 조회 (전 역할)
 * @author trisakion
 * @param req query: { code_group_id, status? }
 * @param res 200 — 코드 아이템 목록
 * @param next 오류 전달
 */
export async function getCodeItemList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code_group_id, status } = req.query;
    if (!code_group_id) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const codeGroupId = parsePositiveInt(code_group_id);
    if (codeGroupId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const statusNum = status !== undefined ? Number(status) : null;
    const items = await codeItemService.getCodeItemList(codeGroupId, statusNum, req.user!.role_code, req.user!.user_id);
    success(res, { items: items.map(formatCodeItem) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /code-items/:code_item_id — 코드 아이템 단건 조회 (전 역할)
 * @author trisakion
 * @param req params: { code_item_id }
 * @param res 200 — 코드 아이템 정보
 * @param next 오류 전달
 */
export async function getCodeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const codeItemId = parsePositiveInt(req.params.code_item_id);
    if (codeItemId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const codeItem = await codeItemService.getCodeItem(codeItemId, req.user!.role_code, req.user!.user_id);
    success(res, formatCodeItem(codeItem));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /code-items/:code_item_id — 코드 아이템 수정 (SUPER_ADMIN)
 * @author trisakion
 * @param req params: { code_item_id }, body: { code_name?, description?, display_order?, status? }
 * @param res 200 — 수정된 코드 아이템 정보
 * @param next 오류 전달
 */
export async function updateCodeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const codeItemId = parsePositiveInt(req.params.code_item_id);
    if (codeItemId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { code_name, description, display_order, status } = req.body;
    const codeItem = await codeItemService.updateCodeItem(
      codeItemId,
      code_name ?? null,
      description ?? null,
      display_order ?? null,
      status ?? null,
      req.user!.user_id,
      req.user!.role_code,
    );
    success(res, formatCodeItem(codeItem));
  } catch (err) {
    next(err);
  }
}
