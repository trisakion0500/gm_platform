import { callSP } from '../config/db';
import { CodeGroupRow, ActiveCodeItemRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * 코드 그룹을 생성하고 생성된 코드 그룹 정보를 반환한다.
 * project 미존재/비활성 시 DBError(31002), code_group_code 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 */
export async function createCodeGroup(
  projectId: number,
  codeGroupCode: string,
  codeGroupName: string,
  description: string | null,
  createdBy: number,
): Promise<CodeGroupRow> {
  const [status, [data]] = await callSP('SP_CREATE_CODE_GROUP', [projectId, codeGroupCode, codeGroupName, description, createdBy]);
  switch (status[0].RESULT) {
    case 31002: throw toDBError(ERROR_MAP.PROJECT_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as CodeGroupRow;
}

/**
 * 프로젝트의 코드 그룹 목록을 반환한다.
 * @author trisakion
 */
export async function getCodeGroupList(
  projectId: number,
  status: number | null,
): Promise<CodeGroupRow[]> {
  const [, [data]] = await callSP('SP_GET_CODE_GROUP_LIST', [projectId, status]);
  return data as unknown as CodeGroupRow[];
}

/**
 * 코드 그룹 단건을 조회한다. 미존재 시 null을 반환한다.
 * @author trisakion
 */
export async function getCodeGroup(codeGroupId: number): Promise<CodeGroupRow | null> {
  const [status, [data]] = await callSP('SP_GET_CODE_GROUP', [codeGroupId]);
  if (status[0].RESULT === 31004)
    return null;
  return data[0] as unknown as CodeGroupRow;
}

/**
 * 코드 그룹 정보를 수정하고 수정된 정보를 반환한다.
 * 코드 그룹 미존재 시 DBError(31004)를 던진다.
 * @author trisakion
 */
export async function updateCodeGroup(
  codeGroupId: number,
  codeGroupName: string | null,
  description: string | null,
  status: number | null,
  updatedBy: number,
): Promise<CodeGroupRow> {
  const [spStatus, [data]] = await callSP('SP_UPDATE_CODE_GROUP', [codeGroupId, codeGroupName, description, status, updatedBy]);
  if (spStatus[0].RESULT === 31004)
    throw toDBError(ERROR_MAP.CODE_GROUP_NOT_FOUND);
  return data[0] as unknown as CodeGroupRow;
}

/**
 * 코드 그룹의 활성 아이템 목록을 반환한다. 렌더링용으로 code_value, code_name만 포함한다.
 * @author trisakion
 */
export async function getActiveCodeItems(codeGroupId: number): Promise<ActiveCodeItemRow[]> {
  const [, [data]] = await callSP('SP_GET_ACTIVE_CODE_ITEMS', [codeGroupId]);
  return data as unknown as ActiveCodeItemRow[];
}
