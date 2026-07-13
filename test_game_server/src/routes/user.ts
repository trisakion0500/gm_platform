import { Router, Request, Response, NextFunction } from "express";
import * as userDb from "../db/user.db";
import { success, fail, formatDatetime } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";
import { UserRow } from "../types";

const router = Router();

function toPositiveInt(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0)
    return null;
  return n;
}

function formatUser(u: UserRow) {
  return {
    ...u,
    created_at: formatDatetime(u.created_at),
    updated_at: formatDatetime(u.updated_at),
  };
}

router.post("/get-user", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = toPositiveInt(req.body?.user_id);
    if (userId === null) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const user = await userDb.getUser(userId);
    if (!user) {
      fail(res, ERROR_MAP.USER_NOT_FOUND);
      return;
    }
    success(res, [formatUser(user)]);
  } catch (err) {
    next(err);
  }
});

router.post("/get-user-list", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nickname, from_created_at, to_created_at, from_updated_at, to_updated_at } = req.body ?? {};
    const users = await userDb.getUserList(
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
});

router.post("/update-user-status", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = toPositiveInt(req.body?.user_id);
    const status = Number(req.body?.status);
    if (userId === null || ![1, 2, 3].includes(status)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const user = await userDb.updateUserStatus(userId, status);
    success(res, [formatUser(user)]);
  } catch (err) {
    next(err);
  }
});

export default router;
