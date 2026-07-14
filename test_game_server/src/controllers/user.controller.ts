import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";
import { success, fail, formatDatetime } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";
import { parsePositiveInt } from "../utils/validation";
import { UserRow } from "../types";

/**
 * UserRow의 날짜 필드를 문자열로 변환한다.
 * @param u 유저 DB 행
 * @returns 날짜 필드가 포맷된 응답 객체
 */
function formatUser(u: UserRow) {
  return {
    ...u,
    created_at: formatDatetime(u.created_at),
    updated_at: formatDatetime(u.updated_at),
  };
}

/**
 * POST /get-user — 유저 상세 조회
 * @param req body: { user_id }
 * @param res 200 — 유저 정보
 * @param next 오류 전달
 * @returns void
 */
export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parsePositiveInt(req.body?.user_id);
    if (userId === null) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const user = await userService.getUser(userId);
    if (!user) {
      fail(res, ERROR_MAP.USER_NOT_FOUND);
      return;
    }
    success(res, [formatUser(user)]);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /get-user-list — 유저 목록 조회
 * @param req body: { nickname?, from_created_at?, to_created_at?, from_updated_at?, to_updated_at? }
 * @param res 200 — 유저 목록
 * @param next 오류 전달
 * @returns void
 */
export async function getUserList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nickname, from_created_at, to_created_at, from_updated_at, to_updated_at } = req.body ?? {};
    const users = await userService.getUserList(
      nickname ?? null,
      from_created_at ?? null,
      to_created_at ?? null,
      from_updated_at ?? null,
      to_updated_at ?? null,
    );
    success(res, users.map(formatUser));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /update-user-status — 유저 상태 변경
 * @param req body: { user_id, status }
 * @param res 200 — 변경된 유저 정보
 * @param next 오류 전달
 * @returns void
 */
export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parsePositiveInt(req.body?.user_id);
    const status = Number(req.body?.status);
    if (userId === null || ![1, 2, 3].includes(status)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const user = await userService.updateUserStatus(userId, status);
    success(res, [formatUser(user)]);
  } catch (err) {
    next(err);
  }
}
