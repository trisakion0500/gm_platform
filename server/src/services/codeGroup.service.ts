import { CodeGroupRow, ActiveCodeItemRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import * as db from '../db/codeGroup.db';

/**
 * 코드 그룹을 생성한다.
 * @author trisakion
 */
export async function createCodeGroup(
  projectId: number,
  codeGroupCode: string,
  codeGroupName: string,
  description: string | null,
  createdBy: number,
): Promise<CodeGroupRow> {
  return db.createCodeGroup(projectId, codeGroupCode, codeGroupName, description, createdBy);
}

/**
 * 프로젝트의 코드 그룹 목록을 반환한다.
 * @author trisakion
 */
export async function getCodeGroupList(
  projectId: number,
  status: number | null,
): Promise<CodeGroupRow[]> {
  return db.getCodeGroupList(projectId, status);
}

/**
 * 코드 그룹 단건을 조회한다. 미존재 시 AppError(31004)를 던진다.
 * @author trisakion
 */
export async function getCodeGroup(codeGroupId: number): Promise<CodeGroupRow> {
  const codeGroup = await db.getCodeGroup(codeGroupId);
  if (!codeGroup) throw toAppError(ERROR_MAP.CODE_GROUP_NOT_FOUND);
  return codeGroup;
}

/**
 * 코드 그룹 정보를 수정한다.
 * @author trisakion
 */
export async function updateCodeGroup(
  codeGroupId: number,
  codeGroupName: string | null,
  description: string | null,
  status: number | null,
  updatedBy: number,
): Promise<CodeGroupRow> {
  return db.updateCodeGroup(codeGroupId, codeGroupName, description, status, updatedBy);
}

/**
 * 코드 그룹의 활성 아이템 목록을 반환한다.
 * @author trisakion
 */
export async function getActiveCodeItems(codeGroupId: number): Promise<ActiveCodeItemRow[]> {
  return db.getActiveCodeItems(codeGroupId);
}
