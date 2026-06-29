import { CodeItemRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import * as db from '../db/codeItem.db';

/**
 * 코드 아이템을 생성한다.
 * @author trisakion
 */
export async function createCodeItem(
  codeGroupId: number,
  codeValue: string,
  codeName: string,
  description: string | null,
  displayOrder: number,
  createdBy: number,
): Promise<CodeItemRow> {
  return db.createCodeItem(codeGroupId, codeValue, codeName, description, displayOrder, createdBy);
}

/**
 * 코드 그룹의 코드 아이템 목록을 반환한다.
 * @author trisakion
 */
export async function getCodeItemList(
  codeGroupId: number,
  status: number | null,
): Promise<CodeItemRow[]> {
  return db.getCodeItemList(codeGroupId, status);
}

/**
 * 코드 아이템 단건을 조회한다. 미존재 시 AppError(31005)를 던진다.
 * @author trisakion
 */
export async function getCodeItem(codeItemId: number): Promise<CodeItemRow> {
  const codeItem = await db.getCodeItem(codeItemId);
  if (!codeItem) throw toAppError(ERROR_MAP.CODE_ITEM_NOT_FOUND);
  return codeItem;
}

/**
 * 코드 아이템 정보를 수정한다.
 * @author trisakion
 */
export async function updateCodeItem(
  codeItemId: number,
  codeName: string | null,
  description: string | null,
  displayOrder: number | null,
  status: number | null,
  updatedBy: number,
): Promise<CodeItemRow> {
  return db.updateCodeItem(codeItemId, codeName, description, displayOrder, status, updatedBy);
}
