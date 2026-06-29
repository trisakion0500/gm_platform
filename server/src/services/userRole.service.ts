import { UserRoleRow } from '../types';
import * as db from '../db/userRole.db';

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
): Promise<UserRoleRow[]> {
  return db.getUserRoleList(userId, projectId, roleCode, status);
}

/**
 * User Role을 등록한다.
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
  return db.createUserRole(userId, projectId, roleCode);
}

/**
 * User Role을 수정한다.
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
  return db.updateUserRole(userId, projectId, roleCode, status);
}
