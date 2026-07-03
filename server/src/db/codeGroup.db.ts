import { callSP } from '../config/db';
import { CodeGroupRow, ActiveCodeItemRow, ActiveCodeGroupItemFlatRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * 코드 그룹을 생성하고 생성된 코드 그룹 정보를 반환한다.
 * project 미존재/비활성 시 DBError(31002), code_group_code 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param projectId 소속 프로젝트 ID
 * @param codeGroupCode 코드 그룹 코드
 * @param codeGroupName 코드 그룹명
 * @param description 설명 (없으면 null)
 * @param createdBy 생성자 user_id
 * @returns 생성된 코드 그룹 정보
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
 * @param projectId 소속 프로젝트 ID
 * @param status 상태 필터 (null=전체)
 * @returns 코드 그룹 목록
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
 * @param codeGroupId 조회할 코드 그룹 ID
 * @returns 코드 그룹 정보, 없으면 null
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
 * @param codeGroupId 수정할 코드 그룹 ID
 * @param codeGroupName 코드 그룹명 (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param updatedBy 수정자 user_id
 * @returns 수정된 코드 그룹 정보
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
 * @param codeGroupId 조회할 코드 그룹 ID
 * @returns 활성 코드 아이템 목록 (code_value, code_name만 포함)
 */
export async function getActiveCodeItems(codeGroupId: number): Promise<ActiveCodeItemRow[]> {
  const [, [data]] = await callSP('SP_GET_ACTIVE_CODE_ITEMS', [codeGroupId]);
  return data as unknown as ActiveCodeItemRow[];
}

/**
 * 프로젝트의 활성 코드그룹 + 각 그룹의 활성 아이템을 flat 행으로 반환한다 (그룹핑은 서비스 레이어에서 처리).
 * @author trisakion
 * @param projectId 조회할 프로젝트 ID
 * @returns flat 행 목록 (아이템 없는 그룹은 code_value/code_name이 null)
 */
export async function getActiveCodeGroupsWithItems(projectId: number): Promise<ActiveCodeGroupItemFlatRow[]> {
  const [, [data]] = await callSP('SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS', [projectId]);
  return data as unknown as ActiveCodeGroupItemFlatRow[];
}
