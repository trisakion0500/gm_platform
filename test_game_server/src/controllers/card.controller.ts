import { Request, Response, NextFunction } from "express";
import * as cardService from "../services/card.service";
import { success, fail, formatDatetime } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";
import { parsePositiveInt } from "../utils/validation";
import { CardRow } from "../types";

/**
 * CardRow의 날짜 필드를 문자열로 변환한다.
 * @param c 카드 DB 행
 * @returns 날짜 필드가 포맷된 응답 객체
 */
function formatCard(c: CardRow) {
  return {
    ...c,
    acquired_at: formatDatetime(c.acquired_at),
    updated_at: formatDatetime(c.updated_at),
  };
}

/**
 * POST /get-card-list — 보유 카드 목록 조회
 * @param req body: { user_id, card_type?, card_code?, from_acquired_at?, to_acquired_at?, from_updated_at?, to_updated_at? }
 * @param res 200 — 보유 카드 목록
 * @param next 오류 전달
 * @returns void
 */
export async function getCardList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parsePositiveInt(req.body?.user_id);
    if (userId === null) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const {
      card_type, card_code,
      from_acquired_at, to_acquired_at,
      from_updated_at, to_updated_at,
    } = req.body ?? {};
    const cards = await cardService.getCardList(
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
}

/**
 * POST /grant-card — 카드 지급
 * @param req body: { user_id, card_type, card_code, quantity }
 * @param res 200 — 지급 후 카드 정보
 * @param next 오류 전달
 * @returns void
 */
export async function grantCard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parsePositiveInt(req.body?.user_id);
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
    const card = await cardService.grantCard(userId, cardType, cardCode, quantity);
    success(res, [formatCard(card)]);
  } catch (err) {
    next(err);
  }
}
