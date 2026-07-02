import { UserRoleRow } from '../types';
import { ROLE } from '../constants/roles';
import * as db from '../db/userRole.db';
import * as audit from './logAudit.service';

/**
 * 호출자 본인의 특정 프로젝트에 대한 role_code를 조회한다.
 * SUPER_ADMIN은 user_role 배정과 무관하게 항상 10을 반환한다.
 * @author trisakion
 * @param callerUserId 호출자 user_id
 * @param callerRoleCode 호출자 JWT의 전역 role_code
 * @param projectId 조회할 project_id
 * @returns role_code, 활성 배정이 없으면 null
 */
export async function getMyRole(
  callerUserId: number,
  callerRoleCode: number,
  projectId: number,
): Promise<number | null> {
  if (callerRoleCode === ROLE.SUPER_ADMIN)
    return ROLE.SUPER_ADMIN;
  const roles = await db.getUserRoleList(callerUserId, projectId, null, 1, null);
  return roles[0]?.role_code ?? null;
}

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
  return db.getUserRoleList(userId, projectId, roleCode, status, companyId);
}

/**
 * User Role을 등록한다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param projectId 프로젝트 ID
 * @param roleCode 역할 코드 (20/30/40)
 * @param callerUserId 작업 수행 사용자 ID
 * @returns 등록된 User Role 정보
 */
export async function createUserRole(
  userId: number,
  projectId: number,
  roleCode: number,
  callerUserId: number,
): Promise<UserRoleRow> {
  const after = await db.createUserRole(userId, projectId, roleCode);
  audit.logCreateUserRole(userId, projectId, after.login_id,
    after as unknown as Record<string, unknown>, callerUserId);
  return after;
}

/**
 * User Role을 수정한다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param projectId 프로젝트 ID
 * @param roleCode 역할 코드 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param callerUserId 작업 수행 사용자 ID
 * @returns 수정된 User Role 정보
 */
export async function updateUserRole(
  userId: number,
  projectId: number,
  roleCode: number | null,
  status: number | null,
  callerUserId: number,
): Promise<UserRoleRow> {
  const beforeList = await db.getUserRoleList(userId, projectId, null, null, null);
  const after      = await db.updateUserRole(userId, projectId, roleCode, status);
  const before     = beforeList[0];
  audit.logUpdateUserRole(userId, projectId, after.login_id,
    before! as unknown as Record<string, unknown>,
    after   as unknown as Record<string, unknown>,
    callerUserId);
  return after;
}
