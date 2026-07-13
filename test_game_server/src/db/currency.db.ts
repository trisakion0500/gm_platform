import { callSP } from "../config/db";
import { CurrencyRow } from "../types";
import { toDBError, ERROR_MAP } from "../constants/errors";

/**
 * user_id로 재화 잔액 목록을 조회한다.
 * @param userId 조회할 유저 ID
 * @returns 재화 잔액 목록
 */
export async function getCurrencyList(userId: number): Promise<CurrencyRow[]> {
  const [, [data]] = await callSP("SP_GET_CURRENCY_LIST", [userId]);
  return data as unknown as CurrencyRow[];
}

/**
 * 유저 재화를 지급/차감한다.
 * 유저 미존재 시 DBError(31001), 허용되지 않는 재화종류면 DBError(30003), 잔액 부족 시 DBError(31002)를 던진다.
 * @param userId 대상 유저 ID
 * @param currencyType 재화 종류 (1:유료다이아, 2:무료다이아, 3:골드)
 * @param amount 증감량 (음수면 차감)
 * @returns 변경된 재화 잔액
 */
export async function grantCurrency(
  userId: number,
  currencyType: number,
  amount: number,
): Promise<CurrencyRow> {
  const [status, [data]] = await callSP("SP_GRANT_CURRENCY", [userId, currencyType, amount]);
  switch (status[0].RESULT) {
    case 31001: throw toDBError(ERROR_MAP.USER_NOT_FOUND);
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
    case 31002: throw toDBError(ERROR_MAP.INSUFFICIENT_BALANCE);
  }
  return data[0] as unknown as CurrencyRow;
}
