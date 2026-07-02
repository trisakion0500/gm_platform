import { CodeGroupRow, ActiveCodeItemRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import { ROLE } from '../constants/roles';
import * as db from '../db/codeGroup.db';
import * as audit from './logAudit.service';
import { assertProjectRole } from './projectRole.service';

/**
 * 코드 그룹을 생성한다.
 * @author trisakion
 * @param projectId 소속 프로젝트 ID
 * @param codeGroupCode 코드 그룹 코드
 * @param codeGroupName 코드 그룹명
 * @param description 설명 (없으면 null)
 * @param createdBy 생성자 user_id
 * @param callerRoleCode 생성자 JWT의 전역 role_code (SUPER_ADMIN 외에는 projectId 소속 DEVELOPER 여부를 재검증)
 * @returns 생성된 코드 그룹 정보
 */
export async function createCodeGroup(
  projectId: number,
  codeGroupCode: string,
  codeGroupName: string,
  description: string | null,
  createdBy: number,
  callerRoleCode: number,
): Promise<CodeGroupRow> {
  await assertProjectRole(createdBy, callerRoleCode, projectId, [ROLE.DEVELOPER]);
  const after = await db.createCodeGroup(projectId, codeGroupCode, codeGroupName, description, createdBy);
  audit.logCreateCodeGroup(after.project_id, after as unknown as Record<string, unknown>, createdBy);
  return after;
}

/**
 * 프로젝트의 코드 그룹 목록을 반환한다.
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param status 상태 필터 (null=전체)
 * @returns 코드 그룹 목록
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
 * @param codeGroupId 조회할 코드 그룹 ID
 * @returns 코드 그룹 정보
 */
export async function getCodeGroup(codeGroupId: number): Promise<CodeGroupRow> {
  const codeGroup = await db.getCodeGroup(codeGroupId);
  if (!codeGroup)
    throw toAppError(ERROR_MAP.CODE_GROUP_NOT_FOUND);
  return codeGroup;
}

/**
 * 코드 그룹 정보를 수정한다.
 * @author trisakion
 * @param codeGroupId 수정할 코드 그룹 ID
 * @param codeGroupName 코드 그룹명 (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param updatedBy 수정자 user_id
 * @param callerRoleCode 수정자 JWT의 전역 role_code (SUPER_ADMIN 외에는 해당 코드 그룹 소속 프로젝트의 DEVELOPER 여부를 재검증)
 * @returns 수정된 코드 그룹 정보
 */
export async function updateCodeGroup(
  codeGroupId: number,
  codeGroupName: string | null,
  description: string | null,
  status: number | null,
  updatedBy: number,
  callerRoleCode: number,
): Promise<CodeGroupRow> {
  const before = await db.getCodeGroup(codeGroupId);
  if (!before)
    throw toAppError(ERROR_MAP.CODE_GROUP_NOT_FOUND);
  await assertProjectRole(updatedBy, callerRoleCode, before.project_id, [ROLE.DEVELOPER]);
  const after = await db.updateCodeGroup(codeGroupId, codeGroupName, description, status, updatedBy);
  audit.logUpdateCodeGroup(after.project_id,
    before as unknown as Record<string, unknown>,
    after  as unknown as Record<string, unknown>,
    updatedBy);
  return after;
}

/**
 * 코드 그룹의 활성 아이템 목록을 반환한다.
 * @author trisakion
 * @param codeGroupId 코드 그룹 ID
 * @returns 활성 코드 아이템 목록
 */
export async function getActiveCodeItems(codeGroupId: number): Promise<ActiveCodeItemRow[]> {
  return db.getActiveCodeItems(codeGroupId);
}
