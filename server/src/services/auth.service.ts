import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { UserPublicRow } from "../types";
import { hashPassword, comparePassword } from "../utils/bcrypt";
import { signAccessToken } from "../utils/jwt";
import { formatDatetime } from "../utils/response";
import { env } from "../config/env";
import { toAppError, ERROR_MAP } from "../constants/errors";
import * as db from "../db/auth.db";
import * as audit from "./logAudit.service";

/**
 * "7d", "24h", "30m" 형태의 TTL 문자열을 밀리초로 변환한다.
 * 파싱 실패 시 기본값 7일을 반환한다.
 * @author trisakion
 * @param ttl 변환할 TTL 문자열 (d=일, h=시간, m=분)
 * @returns 밀리초 단위의 TTL
 */
function parseRefreshExpiry(ttl: string): number {
  const match = /^(\d+)([dhm])$/.exec(ttl);
  if (!match)
    return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "d")
    return n * 24 * 60 * 60 * 1000;
  if (unit === "h")
    return n * 60 * 60 * 1000;
  return n * 60 * 1000;
}

/**
 * Refresh Token 원문을 SHA-256으로 해시한다.
 * DB에는 원문 대신 해시를 저장하여 탈취 시 피해를 최소화한다.
 * @author trisakion
 * @param token 해시할 Refresh Token 원문 (UUID v4)
 * @returns SHA-256 해시 문자열 (hex)
 */
function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * 회원가입 처리 — 비밀번호를 bcrypt로 해시한 뒤 user를 생성한다.
 * @author trisakion
 * @param companyId 가입할 회사 ID
 * @param requestedProjectId 가입 신청 프로젝트 ID (없으면 null)
 * @param loginId 로그인 ID
 * @param password 평문 비밀번호
 * @param userName 사용자명
 * @param email 이메일
 * @returns 생성된 사용자 공개 정보 (password_hash 제외)
 */
export async function signup(
  companyId: number,
  requestedProjectId: number | null,
  loginId: string,
  password: string,
  userName: string,
  email: string,
): Promise<UserPublicRow> {
  const passwordHash = await hashPassword(password);
  const after = await db.signupUser(
    companyId,
    requestedProjectId,
    loginId,
    passwordHash,
    userName,
    email,
  );
  audit.logCreate('user', String(after.user_id), after.user_name,
    after.company_id, null, after as unknown as Record<string, unknown>, after.user_id);
  return after;
}

/**
 * 로그인 처리 — 비밀번호 검증 후 Access/Refresh Token을 발급하고 세션을 생성한다.
 * 로그인 ID 미존재, 비밀번호 불일치, 사용자 상태 이상(미승인/반려/정지) 시 AppError를 던진다.
 * @author trisakion
 * @param loginId 로그인 ID
 * @param password 평문 비밀번호
 * @returns access_token — JWT 문자열, refresh_token — UUID v4 원문, expired_at — Access Token 만료일시, role_code — 사용자 최고 권한
 */
export async function login(loginId: string, password: string) {
  const user = await db.getUserByLoginId(loginId);
  if (!user)
    throw toAppError(ERROR_MAP.LOGIN_FAILED);

  const match = await comparePassword(password, user.password_hash);
  if (!match)
    throw toAppError(ERROR_MAP.LOGIN_FAILED);

  if (user.status !== 1) {
    switch (user.status) {
      case 0: throw toAppError(ERROR_MAP.PENDING_APPROVAL);
      case 2: throw toAppError(ERROR_MAP.SIGNUP_REJECTED);
      case 3: throw toAppError(ERROR_MAP.ACCOUNT_SUSPENDED);
      default: throw toAppError(ERROR_MAP.LOGIN_FAILED);
    }
  }

  const { token, jti, expiredAt } = signAccessToken({
    user_id: user.user_id,
    company_id: user.company_id,
    role_code: user.role_code,
  });

  const refreshToken = uuidv4();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const sessionExpiredAt = new Date(
    Date.now() + parseRefreshExpiry(env.jwt.refreshExpiresIn),
  );

  await db.createLoginSession(
    user.user_id,
    jti,
    refreshTokenHash,
    sessionExpiredAt,
  );

  return {
    access_token: token,
    refresh_token: refreshToken,
    expired_at: formatDatetime(expiredAt),
    role_code: user.role_code,
  };
}

/**
 * 로그아웃 처리 — 해당 세션을 종료한다 (status → 0).
 * @author trisakion
 * @param sessionId 종료할 세션 ID
 * @returns void
 */
export async function logout(sessionId: number): Promise<void> {
  await db.logoutSession(sessionId);
}

/**
 * Access Token 재발급 — Refresh Token으로 세션을 조회하고 새 JTI를 발급한다.
 * Refresh Token 만료, 세션 무효, 사용자 상태 이상 시 AppError를 던진다.
 * @author trisakion
 * @param refreshToken Refresh Token 원문 (UUID v4)
 * @returns access_token — 새 JWT 문자열, expired_at — 새 Access Token 만료일시, role_code — 사용자 최고 권한
 */
export async function refresh(refreshToken: string) {
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const session = await db.getSessionByRefresh(refreshTokenHash);

  if (!session)
    throw toAppError(ERROR_MAP.REFRESH_TOKEN_EXPIRED);
  // SP_GET_SESSION_BY_REFRESH가 status=1 AND expired_at > NOW()로 필터링하므로 실질적으로 실행되지 않음
  // SP 변경 시 이 체크도 함께 검토할 것
  if (session.session_status !== 1)
    throw toAppError(ERROR_MAP.INVALID_SESSION);
  if (session.user_status !== 1) {
    switch (session.user_status) {
      case 0: throw toAppError(ERROR_MAP.PENDING_APPROVAL);
      case 2: throw toAppError(ERROR_MAP.SIGNUP_REJECTED);
      case 3: throw toAppError(ERROR_MAP.ACCOUNT_SUSPENDED);
      default: throw toAppError(ERROR_MAP.UNAUTHORIZED);
    }
  }

  const { token, jti, expiredAt } = signAccessToken({
    user_id: session.user_id,
    company_id: session.company_id,
    role_code: session.role_code,
  });

  await db.updateSessionJti(session.session_id, jti);

  return {
    access_token: token,
    expired_at: formatDatetime(expiredAt),
    role_code: session.role_code,
  };
}

/**
 * 내 정보 조회 — user_id로 사용자 공개 정보를 반환한다.
 * @author trisakion
 * @param userId 조회할 사용자 ID
 * @returns 사용자 공개 정보 (password_hash 제외)
 */
export async function getMe(userId: number): Promise<UserPublicRow> {
  const user = await db.getUserById(userId);
  if (!user)
    throw toAppError(ERROR_MAP.USER_NOT_FOUND);
  return user;
}

/**
 * 비밀번호 변경 — 현재 비밀번호 검증 후 새 해시로 갱신하고 모든 세션을 종료한다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param currentPassword 현재 평문 비밀번호 (검증용)
 * @param newPassword 새 평문 비밀번호
 * @param callerCompanyId 요청자 소속 회사 ID (audit 기록용)
 * @returns void
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  callerCompanyId: number,
): Promise<void> {
  const before = await db.getUserById(userId);
  const passwordHash = await db.getPasswordHashById(userId);
  if (!passwordHash)
    throw toAppError(ERROR_MAP.USER_NOT_FOUND);

  const match = await comparePassword(currentPassword, passwordHash);
  if (!match)
    throw toAppError(ERROR_MAP.PASSWORD_MISMATCH);

  const newHash = await hashPassword(newPassword);
  await db.updatePassword(userId, newHash);

  const after = await db.getUserById(userId);
  if (before && after)
    audit.logUpdate('user', String(userId), before.user_name,
      callerCompanyId, null,
      before as unknown as Record<string, unknown>,
      after  as unknown as Record<string, unknown>,
      userId);
}
