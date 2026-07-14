import { Request, Response, NextFunction } from "express";
import * as currencyService from "../services/currency.service";
import { success, fail, formatDatetime } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";
import { parsePositiveInt } from "../utils/validation";
import { CurrencyRow } from "../types";

/**
 * CurrencyRow의 날짜 필드를 문자열로 변환한다.
 * @param c 재화 DB 행
 * @returns 날짜 필드가 포맷된 응답 객체
 */
function formatCurrency(c: CurrencyRow) {
  return { ...c, updated_at: formatDatetime(c.updated_at) };
}

/**
 * POST /get-currency-list — 재화 잔액 목록 조회
 * @param req body: { user_id }
 * @param res 200 — 재화 잔액 목록
 * @param next 오류 전달
 * @returns void
 */
export async function getCurrencyList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parsePositiveInt(req.body?.user_id);
    if (userId === null) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const currencies = await currencyService.getCurrencyList(userId);
    success(res, currencies.map(formatCurrency));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /grant-currency — 재화 지급/차감
 * @param req body: { user_id, currency_type, amount }
 * @param res 200 — 변경된 재화 잔액
 * @param next 오류 전달
 * @returns void
 */
export async function grantCurrency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parsePositiveInt(req.body?.user_id);
    const currencyType = Number(req.body?.currency_type);
    const amount = Number(req.body?.amount);
    if (userId === null || ![1, 2, 3].includes(currencyType) || !Number.isInteger(amount)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const currency = await currencyService.grantCurrency(userId, currencyType, amount);
    success(res, [formatCurrency(currency)]);
  } catch (err) {
    next(err);
  }
}
