import { toAppError, ERROR_MAP } from '../constants/errors';
import { ROLE } from '../constants/roles';
import * as userRoleDb from '../db/userRole.db';

/**
 * 호출자가 특정 프로젝트에 대해 allowedRoles 중 하나의 활성 role_code를 실제로 보유했는지 검증한다.
 * JWT의 role_code는 사용자가 가진 모든 프로젝트 중 최고 권한(MIN)이라 프로젝트마다 다를 수 있으므로,
 * project_id를 특정하는 쓰기 작업은 라우트 단의 requireRole만으로는 부족하고 이 함수로 실제
 * user_role 배정을 재검증해야 한다. SUPER_ADMIN은 프로젝트 배정과 무관하게 항상 통과한다.
 * @author trisakion
 * @param callerUserId 호출자 user_id
 * @param callerRoleCode 호출자 JWT의 전역 role_code
 * @param projectId 대상 project_id
 * @param allowedRoles 이 작업에 허용되는 role_code 목록
 * @returns void — 미보유 시 AppError(20001)
 */
export async function assertProjectRole(
  callerUserId: number,
  callerRoleCode: number,
  projectId: number,
  allowedRoles: number[],
): Promise<void> {
  if (callerRoleCode === ROLE.SUPER_ADMIN)
    return;

  const myRoles = await userRoleDb.getUserRoleList(callerUserId, projectId, null, 1, null);
  const myRole = myRoles[0]?.role_code;
  if (myRole === undefined || !allowedRoles.includes(myRole))
    throw toAppError(ERROR_MAP.FORBIDDEN);
}
