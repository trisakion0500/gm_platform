import { toAppError, ERROR_MAP } from '../constants/errors';
import { ROLE } from '../constants/roles';

/**
 * 호출자가 대상 회사(targetCompanyId)에 속한 리소스를 쓰기 작업할 수 있는지 검증한다.
 * SUPER_ADMIN은 항상 통과하고, 그 외에는 호출자 소속 회사와 대상 회사가 일치해야 한다.
 * 현재 company/project/user 쓰기 라우트는 전부 SUPER_ADMIN 전용이라 이 검증에 걸릴 경로가 없지만,
 * 향후 DEVELOPER 등으로 쓰기 권한이 확장될 경우를 대비한 방어 코드다 (assertProjectRole과 동일한 목적).
 * @author trisakion
 * @param callerRoleCode 호출자 JWT의 역할 코드
 * @param callerCompanyId 호출자 소속 회사 ID
 * @param targetCompanyId 대상 리소스의 소속 회사 ID
 * @returns void — 소속 불일치 시 AppError(20001)
 */
export function assertCompanyScope(
  callerRoleCode: number,
  callerCompanyId: number,
  targetCompanyId: number,
): void {
  if (callerRoleCode === ROLE.SUPER_ADMIN)
    return;
  if (callerCompanyId !== targetCompanyId)
    throw toAppError(ERROR_MAP.FORBIDDEN);
}
