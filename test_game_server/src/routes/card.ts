import { Router, Request, Response, NextFunction } from "express";
import * as cardDb from "../db/card.db";
import { success, fail, formatDatetime } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";
import { CardRow } from "../types";

const router = Router();

function toPositiveInt(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0)
    return null;
  return n;
}

function formatCard(c: CardRow) {
  return {
    ...c,
    acquired_at: formatDatetime(c.acquired_at),
    updated_at: formatDatetime(c.updated_at),
  };
}

router.post("/get-card-list", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = toPositiveInt(req.body?.user_id);
    if (userId === null) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const {
      card_type, card_code,
      from_acquired_at, to_acquired_at,
      from_updated_at, to_updated_at,
    } = req.body ?? {};
    const cards = await cardDb.getCardList(
      userId,
      card_type ?? null,
      card_code ?? null,
      from_acquired_at ?? null,
      to_acquired_at ?? null,
      from_updated_at ?? null,
      to_updated_at ?? null,
    );
    success(res, cards.map(formatCard));
  } catch (err) {
    next(err);
  }
});

router.post("/grant-card", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = toPositiveInt(req.body?.user_id);
    const cardType = Number(req.body?.card_type);
    const cardCode = req.body?.card_code;
    const quantity = Number(req.body?.quantity);
    if (
      userId === null
      || ![1, 2].includes(cardType)
      || typeof cardCode !== "string" || cardCode.length === 0
      || !Number.isInteger(quantity) || quantity < 1
    ) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const card = await cardDb.grantCard(userId, cardType, cardCode, quantity);
    success(res, [formatCard(card)]);
  } catch (err) {
    next(err);
  }
});

export default router;
