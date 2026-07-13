import { Router, Request, Response, NextFunction } from "express";
import * as currencyDb from "../db/currency.db";
import { success, fail, formatDatetime } from "../utils/response";
import { ERROR_MAP } from "../constants/errors";
import { CurrencyRow } from "../types";

const router = Router();

function toPositiveInt(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0)
    return null;
  return n;
}

function formatCurrency(c: CurrencyRow) {
  return { ...c, updated_at: formatDatetime(c.updated_at) };
}

router.post("/get-currency-list", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = toPositiveInt(req.body?.user_id);
    if (userId === null) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const currencies = await currencyDb.getCurrencyList(userId);
    success(res, currencies.map(formatCurrency));
  } catch (err) {
    next(err);
  }
});

router.post("/grant-currency", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = toPositiveInt(req.body?.user_id);
    const currencyType = Number(req.body?.currency_type);
    const amount = Number(req.body?.amount);
    if (userId === null || ![1, 2, 3].includes(currencyType) || !Number.isInteger(amount)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const currency = await currencyDb.grantCurrency(userId, currencyType, amount);
    success(res, [formatCurrency(currency)]);
  } catch (err) {
    next(err);
  }
});

export default router;
