import { callSP } from "../config/db";
import { CardRow } from "../types";
import { toDBError, ERROR_MAP } from "../constants/errors";

/**
 * 조건에 맞는 유저 보유 카드 목록을 조회한다.
 * @param userId 조회할 유저 ID
 * @param cardType 카드 종류 필터 (null=전체, 1:캐릭터, 2:아이템)
 * @param cardCode 카드 코드 완전일치 검색 (null=제한없음)
 * @param fromAcquiredAt 획득일시 시작 (null=제한없음)
 * @param toAcquiredAt 획득일시 종료 (null=제한없음)
 * @param fromUpdatedAt 수정일시 시작 (null=제한없음)
 * @param toUpdatedAt 수정일시 종료 (null=제한없음)
 * @returns 보유 카드 목록
 */
export async function getCardList(
  userId: number,
  cardType: number | null,
  cardCode: string | null,
  fromAcquiredAt: string | null,
  toAcquiredAt: string | null,
  fromUpdatedAt: string | null,
  toUpdatedAt: string | null,
): Promise<CardRow[]> {
  const [, [data]] = await callSP("SP_GET_CARD_LIST", [
    userId,
    cardType,
    cardCode,
    fromAcquiredAt,
    toAcquiredAt,
    fromUpdatedAt,
    toUpdatedAt,
  ]);
  return data as unknown as CardRow[];
}

/**
 * 유저에게 카드를 지급한다. 이미 보유 중이면 수량을 누적한다.
 * 유저 미존재 시 DBError(31001), 허용되지 않는 카드종류·수량이면 DBError(30003)를 던진다.
 * @param userId 대상 유저 ID
 * @param cardType 카드 종류 (1:캐릭터, 2:아이템)
 * @param cardCode 카드 코드
 * @param quantity 지급 수량
 * @returns 지급 후 카드 정보
 */
export async function grantCard(
  userId: number,
  cardType: number,
  cardCode: string,
  quantity: number,
): Promise<CardRow> {
  const [status, [data]] = await callSP("SP_GRANT_CARD", [userId, cardType, cardCode, quantity]);
  switch (status[0].RESULT) {
    case 31001: throw toDBError(ERROR_MAP.USER_NOT_FOUND);
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
  }
  return data[0] as unknown as CardRow;
}
