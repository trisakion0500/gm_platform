import bcrypt from 'bcrypt';
import { UserAdminRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import { encrypt, decrypt } from '../utils/crypto';
import * as db from '../db/user.db';
import * as audit from './logAudit.service';

/**
 * 사용자 목록을 페이지네이션으로 조회한다.
 * @author trisakion
 * @param companyId 회사 ID 필터 (null=전체, SUPER_ADMIN만 유효)
 * @param status 상태 필터 (null=전체, SUPER_ADMIN·DEVELOPER 모두 사용 가능)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/50/100)
 * @param roleCode 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
 * @param userCompanyId 요청자 소속 회사 ID (DEVELOPER는 본인 소속 회사로 스코핑, status 제한은 없음)
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
  return {
    page,
    page_size: pageSize,
    ...result,
    items: result.items.map((u) => ({ ...u, phone_number: decrypt(u.phone_number) })),
  };
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
  return { ...user, phone_number: decrypt(user.phone_number) };
}

/**
 * 사용자 정보를 수정한다.
 * @author trisakion
 * @param userId 수정할 사용자 ID
 * @param userName 이름 (null=변경 없음)
 * @param email 이메일 (null=변경 없음)
 * @param phoneNumber 휴대폰 번호 (평문, null=변경 없음 — 서비스 레이어에서 암호화 후 저장)
 * @param department 부서 (null=변경 없음)
 * @param position 직급 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param callerUserId 작업 수행 사용자 ID
 * @returns 수정된 사용자 정보
 */
export async function updateUser(
  userId: number,
  userName: string | null,
  email: string | null,
  phoneNumber: string | null,
  department: string | null,
  position: string | null,
  status: number | null,
  callerUserId: number,
): Promise<UserAdminRow> {
  const before = await db.getUser(userId);
  const after  = await db.updateUser(userId, userName, email, phoneNumber ? encrypt(phoneNumber) : null, department, position, status);
  audit.logUpdate('user', String(after.user_id), after.user_name,
    after.company_id, null,
    before! as unknown as Record<string, unknown>,
    after   as unknown as Record<string, unknown>,
    callerUserId);
  return { ...after, phone_number: decrypt(after.phone_number) };
}

/**
 * 가입 승인 처리한다. 승인대기(status=0) 상태가 아닌 경우 AppError(30003)를 던진다.
 * @author trisakion
 * @param userId 승인할 사용자 ID
 * @param callerUserId 작업 수행 사용자 ID
 */
export async function approveUser(userId: number, callerUserId: number): Promise<void> {
  const before = await db.getUser(userId);
  const after  = await db.approveUser(userId);
  audit.logUpdate('user', String(after.user_id), after.user_name,
    after.company_id, null,
    before! as unknown as Record<string, unknown>,
    after   as unknown as Record<string, unknown>,
    callerUserId);
}

/**
 * 가입 반려 처리한다. 승인대기(status=0) 상태가 아닌 경우 AppError(30003)를 던진다.
 * @author trisakion
 * @param userId 반려할 사용자 ID
 * @param callerUserId 작업 수행 사용자 ID
 */
export async function rejectUser(userId: number, callerUserId: number): Promise<void> {
  const before = await db.getUser(userId);
  const after  = await db.rejectUser(userId);
  audit.logUpdate('user', String(after.user_id), after.user_name,
    after.company_id, null,
    before! as unknown as Record<string, unknown>,
    after   as unknown as Record<string, unknown>,
    callerUserId);
}

/**
 * 비밀번호를 강제 초기화한다. 사용자의 모든 활성 세션도 함께 종료된다.
 * @author trisakion
 * @param userId 초기화할 사용자 ID
 * @param newPassword 새 비밀번호 (평문)
 * @param callerUserId 작업 수행 사용자 ID
 */
export async function resetPassword(userId: number, newPassword: string, callerUserId: number): Promise<void> {
  const before = await db.getUser(userId);
  if (!before)
    throw toAppError(ERROR_MAP.USER_NOT_FOUND);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.resetPassword(userId, passwordHash);
  const after = await db.getUser(userId);
  audit.logUpdate('user', String(userId), before.user_name,
    before.company_id, null,
    before  as unknown as Record<string, unknown>,
    after!  as unknown as Record<string, unknown>,
    callerUserId);
}
