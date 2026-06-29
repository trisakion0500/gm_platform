import { callSP } from '../config/db';
import { UserRoleRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * User Role 목록을 조회한다.
 * @author trisakion
 * @param userId 사용자 ID 필터 (null=전체)
 * @param projectId 프로젝트 ID 필터 (null=전체)
 * @param roleCode 역할 코드 필터 (null=전체)
 * @param status 상태 필터 (null=전체)
 * @returns User Role 목록
 */
export async function getUserRoleList(
  userId: number | null,
  projectId: number | null,
  roleCode: number | null,
  status: number | null,
  companyId: number | null,
): Promise<UserRoleRow[]> {
  const [, [items]] = await callSP('SP_GET_USER_ROLE_LIST', [userId, projectId, roleCode, status, companyId]);
  return items as unknown as UserRoleRow[];
}

/**
 * User Role을 등록하고 등록된 정보를 반환한다.
 * user 미존재 시 DBError(31003), project 미존재 시 DBError(31002),
 * company 불일치 또는 role_code 범위 오류 시 DBError(30003), 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param projectId 프로젝트 ID
 * @param roleCode 역할 코드 (20/30/40)
 * @returns 등록된 User Role 정보
 */
export async function createUserRole(
  userId: number,
  projectId: number,
  roleCode: number,
): Promise<UserRoleRow> {
  const [spStatus, [data]] = await callSP('SP_CREATE_USER_ROLE', [userId, projectId, roleCode]);
  switch (spStatus[0].RESULT) {
    case 31003: throw toDBError(ERROR_MAP.USER_NOT_FOUND);
    case 31002: throw toDBError(ERROR_MAP.PROJECT_NOT_FOUND);
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as UserRoleRow;
}

/**
 * User Role을 수정하고 수정된 정보를 반환한다.
 * user_role 미존재 또는 role_code 범위 오류 시 DBError(30003)를 던진다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param projectId 프로젝트 ID
 * @param roleCode 역할 코드 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @returns 수정된 User Role 정보
 */
export async function updateUserRole(
  userId: number,
  projectId: number,
  roleCode: number | null,
  status: number | null,
): Promise<UserRoleRow> {
  const [spStatus, [data]] = await callSP('SP_UPDATE_USER_ROLE', [userId, projectId, roleCode, status]);
  switch (spStatus[0].RESULT) {
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
  }
  return data[0] as unknown as UserRoleRow;
}
