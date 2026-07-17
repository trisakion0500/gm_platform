import { CodeItemRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import { ROLE } from '../constants/roles';
import * as db from '../db/codeItem.db';
import * as audit from './logAudit.service';
import { assertProjectRole } from './projectRole.service';

/**
 * 코드 아이템을 생성한다.
 * @author trisakion
 * @param codeGroupId 소속 코드 그룹 ID
 * @param codeValue 코드 값
 * @param codeName 코드 표시명
 * @param description 설명 (없으면 null)
 * @param displayOrder 화면 표시 순서
 * @param createdBy 생성자 user_id
 * @param callerRoleCode 생성자 JWT의 전역 role_code (SUPER_ADMIN 외에는 해당 코드 그룹 소속 프로젝트의 DEVELOPER 여부를 재검증)
 * @returns 생성된 코드 아이템 정보
 */
export async function createCodeItem(
  codeGroupId: number,
  codeValue: string,
  codeName: string,
  description: string | null,
  displayOrder: number,
  createdBy: number,
  callerRoleCode: number,
): Promise<CodeItemRow> {
  const scope = await audit.resolveCodeGroupScope(codeGroupId);
  if (!scope)
    throw toAppError(ERROR_MAP.CODE_GROUP_NOT_FOUND);
  await assertProjectRole(createdBy, callerRoleCode, scope.projectId, [ROLE.DEVELOPER]);
  const after = await db.createCodeItem(codeGroupId, codeValue, codeName, description, displayOrder, createdBy);
  audit.logCreateCodeItem(after.code_group_id, after as unknown as Record<string, unknown>, createdBy);
  return after;
}

/**
 * 코드 그룹의 코드 아이템 목록을 반환한다.
 * @author trisakion
 * @param codeGroupId 코드 그룹 ID
 * @param status 상태 필터 (null=전체)
 * @param callerRoleCode 요청자 역할 코드 (SUPER_ADMIN 외에는 소속 프로젝트에 대한 실제 user_role 보유 여부를 검증)
 * @param callerUserId 요청자 user_id (프로젝트별 역할 검증용)
 * @returns 코드 아이템 목록
 */
export async function getCodeItemList(
  codeGroupId: number,
  status: number | null,
  callerRoleCode: number,
  callerUserId: number,
): Promise<CodeItemRow[]> {
  return db.getCodeItemList(codeGroupId, status, callerRoleCode, callerUserId);
}

/**
 * 코드 아이템 단건을 조회한다. 미존재 또는 접근 불가 시 AppError(31005)를 던진다.
 * @author trisakion
 * @param codeItemId 조회할 코드 아이템 ID
 * @param callerRoleCode 요청자 역할 코드 (SUPER_ADMIN 외에는 소속 코드 그룹의 프로젝트에 대한 실제 user_role 보유 여부를 재검증)
 * @param callerUserId 요청자 user_id (프로젝트별 역할 재검증용)
 * @returns 코드 아이템 정보
 */
export async function getCodeItem(
  codeItemId: number,
  callerRoleCode: number,
  callerUserId: number,
): Promise<CodeItemRow> {
  const codeItem = await db.getCodeItem(codeItemId, callerRoleCode, callerUserId);
  if (!codeItem)
    throw toAppError(ERROR_MAP.CODE_ITEM_NOT_FOUND);
  return codeItem;
}

/**
 * 코드 아이템 정보를 수정한다.
 * @author trisakion
 * @param codeItemId 수정할 코드 아이템 ID
 * @param codeName 코드 표시명 (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param displayOrder 화면 표시 순서 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param updatedBy 수정자 user_id
 * @param callerRoleCode 수정자 JWT의 전역 role_code (SUPER_ADMIN 외에는 해당 코드 아이템 소속 프로젝트의 DEVELOPER 여부를 재검증)
 * @returns 수정된 코드 아이템 정보
 */
export async function updateCodeItem(
  codeItemId: number,
  codeName: string | null,
  description: string | null,
  displayOrder: number | null,
  status: number | null,
  updatedBy: number,
  callerRoleCode: number,
): Promise<CodeItemRow> {
  const before = await db.getCodeItem(codeItemId, callerRoleCode, updatedBy);
  if (!before)
    throw toAppError(ERROR_MAP.CODE_ITEM_NOT_FOUND);
  const scope = await audit.resolveCodeGroupScope(before.code_group_id);
  if (!scope)
    throw toAppError(ERROR_MAP.CODE_GROUP_NOT_FOUND);
  await assertProjectRole(updatedBy, callerRoleCode, scope.projectId, [ROLE.DEVELOPER]);
  const after = await db.updateCodeItem(codeItemId, codeName, description, displayOrder, status, updatedBy);
  audit.logUpdateCodeItem(after.code_group_id,
    before as unknown as Record<string, unknown>,
    after  as unknown as Record<string, unknown>,
    updatedBy);
  return after;
}
