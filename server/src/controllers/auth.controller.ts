import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { success, fail, formatDatetime } from '../utils/response';
import { ERROR_MAP } from '../constants/errors';

// 영문, 숫자, _, ., - 만 허용
const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const PHONE_NUMBER_MAX_LENGTH = 20; // 암호화 후 VARCHAR(255)에 저장되므로 평문은 넉넉히 제한
const DEPARTMENT_MAX_LENGTH = 100;
const POSITION_MAX_LENGTH = 100;

/**
 * POST /auth/signup — 회원가입
 * @author trisakion
 * @param req body: { company_id, requested_project_id?, login_id, password, user_name, email, phone_number, department?, position? }
 * @param res 201 — 생성된 사용자 공개 정보
 * @param next 오류 전달
 * @returns void
 */
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { company_id, requested_project_id, login_id, password, user_name, email, phone_number, department, position } = req.body;
    if (!company_id || !login_id || !password || !user_name || !email || !phone_number) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    if (!LOGIN_ID_PATTERN.test(login_id)) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    if (
      phone_number.length > PHONE_NUMBER_MAX_LENGTH ||
      (department && department.length > DEPARTMENT_MAX_LENGTH) ||
      (position && position.length > POSITION_MAX_LENGTH)
    ) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const user = await authService.signup(
      company_id, requested_project_id ?? null, login_id, password, user_name, email,
      phone_number, department ?? null, position ?? null,
    );
    success(res, {
      ...user,
      last_login_at: formatDatetime(user.last_login_at),
      created_at: formatDatetime(user.created_at),
      updated_at: formatDatetime(user.updated_at),
    }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login — 로그인
 * @author trisakion
 * @param req body: { login_id, password }
 * @param res 200 — { access_token, refresh_token, expired_at, role_code }
 * @param next 오류 전달
 * @returns void
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { login_id, password } = req.body;
    if (!login_id || !password) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const result = await authService.login(login_id, password);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout — 로그아웃 (인증 필요)
 * @author trisakion
 * @param req 인증 필요 — req.user.session_id를 사용하여 현재 세션을 종료한다
 * @param res 200 — null
 * @param next 오류 전달
 * @returns void
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(req.user!.session_id);
    success(res, null);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/refresh — Access Token 재발급
 * @author trisakion
 * @param req body: { refresh_token }
 * @param res 200 — { access_token, expired_at, role_code }
 * @param next 오류 전달
 * @returns void
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const result = await authService.refresh(refresh_token);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/me — 내 정보 조회 (인증 필요)
 * @author trisakion
 * @param req 인증 필요 — req.user.user_id를 사용하여 사용자 정보를 조회한다
 * @param res 200 — 사용자 공개 정보 (password_hash 제외)
 * @param next 오류 전달
 * @returns void
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.user_id);
    success(res, {
      ...user,
      last_login_at: formatDatetime(user.last_login_at),
      created_at: formatDatetime(user.created_at),
      updated_at: formatDatetime(user.updated_at),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /auth/password — 비밀번호 변경 (인증 필요)
 * @author trisakion
 * @param req 인증 필요, body: { current_password, new_password }
 * @param res 200 — null
 * @param next 오류 전달
 * @returns void
 */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    await authService.changePassword(req.user!.user_id, current_password, new_password, req.user!.company_id);
    success(res, null);
  } catch (err) {
    next(err);
  }
}
