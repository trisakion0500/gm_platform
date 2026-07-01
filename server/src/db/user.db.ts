import { callSP } from '../config/db';
import { UserAdminRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * 사용자 목록을 페이지네이션으로 조회한다.
 * SUPER_ADMIN은 전체, DEVELOPER는 본인 소속 회사 + status=1만 반환한다.
 * @author trisakion
 * @param companyId 회사 ID 필터 (null=전체, SUPER_ADMIN만 유효)
 * @param status 상태 필터 (null=전체, SUPER_ADMIN만 유효)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/50/100)
 * @param roleCode 요청자 역할 코드
 * @param userCompanyId 요청자 소속 회사 ID (DEVELOPER 스코핑용)
 * @returns { total_count, items }
 */
export async function getUserList(
  companyId: number | null,
  status: number | null,
  page: number,
  pageSize: number,
  roleCode: number,
  userCompanyId: number,
): Promise<{ total_count: number; items: UserAdminRow[] }> {
  const [, [countRows, itemRows]] = await callSP('SP_GET_USER_LIST', [companyId, status, page, pageSize, roleCode, userCompanyId]);
  return {
    total_count: (countRows[0] as unknown as { total_count: number }).total_count,
    items: itemRows as unknown as UserAdminRow[],
  };
}

/**
 * user_id로 사용자 상세 정보를 조회한다.
 * @author trisakion
 * @param userId 조회할 사용자 ID
 * @returns 사용자 정보 (company JOIN 포함), 존재하지 않으면 null
 */
export async function getUser(userId: number): Promise<UserAdminRow | null> {
  const [status, [data]] = await callSP('SP_GET_USER', [userId]);
  switch (status[0].RESULT) {
    case 31003: return null;
  }
  return data[0] as unknown as UserAdminRow;
}

/**
 * 사용자 정보를 수정하고 수정된 정보를 반환한다.
 * 사용자 미존재 시 DBError(31003), email 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param userId 수정할 사용자 ID
 * @param userName 이름 (null=변경 없음)
 * @param email 이메일 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @returns 수정된 사용자 정보
 */
export async function updateUser(
  userId: number,
  userName: string | null,
  email: string | null,
  status: number | null,
): Promise<UserAdminRow> {
  const [spStatus, [data]] = await callSP('SP_UPDATE_USER', [userId, userName, email, status]);
  switch (spStatus[0].RESULT) {
    case 31003: throw toDBError(ERROR_MAP.USER_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as UserAdminRow;
}

/**
 * 가입 승인 처리하고 승인된 사용자 정보를 반환한다 (status → 1).
 * 사용자 미존재 시 DBError(31003), 승인대기 상태가 아닌 경우 DBError(30003)를 던진다.
 * @author trisakion
 * @param userId 승인할 사용자 ID
 * @returns 승인된 사용자 정보
 */
export async function approveUser(userId: number): Promise<UserAdminRow> {
  const [status, [data]] = await callSP('SP_APPROVE_USER', [userId]);
  switch (status[0].RESULT) {
    case 31003: throw toDBError(ERROR_MAP.USER_NOT_FOUND);
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
  }
  return data[0] as unknown as UserAdminRow;
}

/**
 * 가입 반려 처리하고 반려된 사용자 정보를 반환한다 (status → 2).
 * 사용자 미존재 시 DBError(31003), 승인대기 상태가 아닌 경우 DBError(30003)를 던진다.
 * @author trisakion
 * @param userId 반려할 사용자 ID
 * @returns 반려된 사용자 정보
 */
export async function rejectUser(userId: number): Promise<UserAdminRow> {
  const [status, [data]] = await callSP('SP_REJECT_USER', [userId]);
  switch (status[0].RESULT) {
    case 31003: throw toDBError(ERROR_MAP.USER_NOT_FOUND);
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
  }
  return data[0] as unknown as UserAdminRow;
}

/**
 * 비밀번호 해시를 갱신하고 모든 활성 세션을 종료한다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param passwordHash 새 bcrypt 해시 문자열
 */
export async function resetPassword(userId: number, passwordHash: string): Promise<void> {
  await callSP('SP_UPDATE_PASSWORD', [userId, passwordHash]);
}
