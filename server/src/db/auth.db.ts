import { callSP } from '../config/db';
import { UserRow, UserPublicRow, SessionRow, SessionWithUserRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * 회원가입 — user를 INSERT하고 생성된 사용자 공개 정보를 반환한다.
 * company_id, requested_project_id 유효성 및 login_id/email 중복 검사를 SP에서 수행한다.
 * @author trisakion
 * @param companyId 가입할 회사 ID
 * @param requestedProjectId 가입 신청 프로젝트 ID (없으면 null)
 * @param loginId 로그인 ID
 * @param passwordHash bcrypt 해시된 비밀번호
 * @param userName 사용자명
 * @param email 이메일
 * @returns 생성된 사용자 공개 정보 (password_hash 제외)
 */
export async function signupUser(
  companyId: number,
  requestedProjectId: number | null,
  loginId: string,
  passwordHash: string,
  userName: string,
  email: string,
): Promise<UserPublicRow> {
  const [status, [data]] = await callSP('SP_SIGNUP_USER', [companyId, requestedProjectId, loginId, passwordHash, userName, email]);
  switch (status[0].RESULT) {
    case 31001: throw toDBError(ERROR_MAP.COMPANY_NOT_FOUND);
    case 31002: throw toDBError(ERROR_MAP.PROJECT_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as UserPublicRow;
}

/**
 * 로그인 ID로 사용자를 조회한다. 비밀번호 해시 및 최소 role_code(최고 권한) 포함.
 * @author trisakion
 * @param loginId 조회할 로그인 ID
 * @returns 사용자 정보 (password_hash 포함), 존재하지 않으면 null
 */
export async function getUserByLoginId(loginId: string): Promise<UserRow | null> {
  const [status, [data]] = await callSP('SP_GET_USER_BY_LOGIN_ID', [loginId]);
  switch (status[0].RESULT) {
    case 31003: return null;
  }
  return data[0] as unknown as UserRow;
}

/**
 * user_id로 사용자 공개 정보를 조회한다.
 * @author trisakion
 * @param userId 조회할 사용자 ID
 * @returns 사용자 공개 정보 (password_hash 제외), 존재하지 않으면 null
 */
export async function getUserById(userId: number): Promise<UserPublicRow | null> {
  const [status, [data]] = await callSP('SP_GET_USER_BY_ID', [userId]);
  switch (status[0].RESULT) {
    case 31003: return null;
  }
  return data[0] as unknown as UserPublicRow;
}

/**
 * 로그인 세션을 생성하고 session_id를 반환한다.
 * user.last_login_at 갱신과 user_session INSERT를 하나의 트랜잭션으로 처리한다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param jti Access Token JTI (UUID v4)
 * @param refreshTokenHash Refresh Token SHA-256 해시
 * @param expiredAt 세션 만료일시 (Refresh Token 기준, 7일)
 * @returns 생성된 session_id
 */
export async function createLoginSession(
  userId: number,
  jti: string,
  refreshTokenHash: string,
  expiredAt: Date,
): Promise<number> {
  const [, [data]] = await callSP('SP_CREATE_LOGIN_SESSION', [userId, jti, refreshTokenHash, expiredAt]);
  return data[0].session_id as number;
}

/**
 * JTI로 세션을 조회한다.
 * @author trisakion
 * @param jti 조회할 Access Token JTI
 * @returns 세션 정보 (session_id, user_id, session_status, user_status), 존재하지 않으면 null
 */
export async function getSessionByJti(jti: string): Promise<SessionRow | null> {
  const [status, [data]] = await callSP('SP_GET_SESSION_BY_JTI', [jti]);
  switch (status[0].RESULT) {
    case 10009: return null;
  }
  return data[0] as unknown as SessionRow;
}

/**
 * Refresh Token 해시로 유효한 세션을 조회한다.
 * status=1이고 expired_at이 현재 시각보다 미래인 세션만 반환한다.
 * @author trisakion
 * @param refreshTokenHash 조회할 Refresh Token SHA-256 해시
 * @returns 세션 + 사용자 정보 (session_id, user_id, company_id, role_code 포함), 없거나 만료이면 null
 */
export async function getSessionByRefresh(refreshTokenHash: string): Promise<SessionWithUserRow | null> {
  const [status, [data]] = await callSP('SP_GET_SESSION_BY_REFRESH', [refreshTokenHash]);
  switch (status[0].RESULT) {
    case 10008: return null;
  }
  return data[0] as unknown as SessionWithUserRow;
}

/**
 * 세션의 Access Token JTI를 새 값으로 갱신한다.
 * @author trisakion
 * @param sessionId 갱신할 세션 ID
 * @param jti 새 Access Token JTI
 * @returns void
 */
export async function updateSessionJti(sessionId: number, jti: string): Promise<void> {
  await callSP('SP_UPDATE_SESSION_JTI', [sessionId, jti]);
}

/**
 * 특정 세션을 로그아웃 처리한다 (status → 0).
 * @author trisakion
 * @param sessionId 종료할 세션 ID
 * @returns void
 */
export async function logoutSession(sessionId: number): Promise<void> {
  await callSP('SP_LOGOUT_SESSION', [sessionId]);
}

/**
 * 사용자의 모든 활성 세션을 로그아웃 처리한다 (status=1 전체 → 0).
 * @author trisakion
 * @param userId 세션을 종료할 사용자 ID
 * @returns void
 */
export async function logoutAllSessions(userId: number): Promise<void> {
  await callSP('SP_LOGOUT_ALL_SESSIONS', [userId]);
}

/**
 * user_id로 비밀번호 해시를 조회한다.
 * 비밀번호 변경 시 현재 비밀번호 검증 목적으로만 사용하며, API 응답에 노출하지 않는다.
 * @author trisakion
 * @param userId 조회할 사용자 ID
 * @returns bcrypt 해시 문자열, 존재하지 않으면 null
 */
export async function getPasswordHashById(userId: number): Promise<string | null> {
  const [status, [data]] = await callSP('SP_GET_PASSWORD_HASH_BY_ID', [userId]);
  switch (status[0].RESULT) {
    case 31003: return null;
  }
  return data[0].password_hash as string;
}

/**
 * 비밀번호 해시를 갱신하고 모든 활성 세션을 종료한다.
 * 두 작업을 하나의 트랜잭션으로 처리하여 원자성을 보장한다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param passwordHash 새 bcrypt 해시 문자열
 * @returns void
 */
export async function updatePassword(userId: number, passwordHash: string): Promise<void> {
  await callSP('SP_UPDATE_PASSWORD', [userId, passwordHash]);
}
