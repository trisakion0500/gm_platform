import { CardRow } from "../types";
import * as db from "../db/card.db";

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
  return db.getCardList(userId, cardType, cardCode, fromAcquiredAt, toAcquiredAt, fromUpdatedAt, toUpdatedAt);
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
  return db.grantCard(userId, cardType, cardCode, quantity);
}
