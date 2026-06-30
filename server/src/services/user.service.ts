import bcrypt from 'bcrypt';
import { UserAdminRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import * as db from '../db/user.db';

/**
 * 사용자 목록을 페이지네이션으로 조회한다.
 * @author trisakion
 * @param companyId 회사 ID 필터 (null=전체, SUPER_ADMIN만 유효)
 * @param status 상태 필터 (null=전체, SUPER_ADMIN만 유효)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/50/100)
 * @param roleCode 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
 * @param userCompanyId 요청자 소속 회사 ID (DEVELOPER 스코핑용)
 * @returns 페이지네이션 응답 { page, page_size, total_count, items }
 */
export async function getUserList(
  companyId: number | null,
  status: number | null,
  page: number,
  pageSize: number,
  roleCode: number,
  userCompanyId: number,
): Promise<{ page: number; page_size: number; total_count: number; items: UserAdminRow[] }> {
  const result = await db.getUserList(companyId, status, page, pageSize, roleCode, userCompanyId);
  return { page, page_size: pageSize, ...result };
}

/**
 * 사용자 단건을 조회한다. 존재하지 않거나 DEVELOPER가 타사 사용자 조회 시 AppError(31003)를 던진다.
 * @author trisakion
 * @param userId 조회할 사용자 ID
 * @param roleCode 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
 * @param userCompanyId 요청자 소속 회사 ID (DEVELOPER 스코핑용)
 * @returns 사용자 정보
 */
export async function getUser(userId: number, roleCode: number, userCompanyId: number): Promise<UserAdminRow> {
  const user = await db.getUser(userId);
  if (!user)
    throw toAppError(ERROR_MAP.USER_NOT_FOUND);
  if (roleCode !== 10 && user.company_id !== userCompanyId)
    throw toAppError(ERROR_MAP.USER_NOT_FOUND);
  return user;
}

/**
 * 사용자 정보를 수정한다.
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
  return db.updateUser(userId, userName, email, status);
}

/**
 * 가입 승인 처리한다. 승인대기(status=0) 상태가 아닌 경우 AppError(30003)를 던진다.
 * @author trisakion
 * @param userId 승인할 사용자 ID
 */
export async function approveUser(userId: number): Promise<void> {
  return db.approveUser(userId);
}

/**
 * 가입 반려 처리한다. 승인대기(status=0) 상태가 아닌 경우 AppError(30003)를 던진다.
 * @author trisakion
 * @param userId 반려할 사용자 ID
 */
export async function rejectUser(userId: number): Promise<void> {
  return db.rejectUser(userId);
}

/**
 * 비밀번호를 강제 초기화한다. 사용자의 모든 활성 세션도 함께 종료된다.
 * @author trisakion
 * @param userId 초기화할 사용자 ID
 * @param newPassword 새 비밀번호 (평문)
 */
export async function resetPassword(userId: number, newPassword: string): Promise<void> {
  const user = await db.getUser(userId);
  if (!user)
    throw toAppError(ERROR_MAP.USER_NOT_FOUND);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.resetPassword(userId, passwordHash);
}
