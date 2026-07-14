import { UserRow } from "../types";
import * as db from "../db/user.db";

/**
 * user_id로 유저 상세 정보를 조회한다.
 * @param userId 조회할 유저 ID
 * @returns 유저 정보, 존재하지 않으면 null
 */
export async function getUser(userId: number): Promise<UserRow | null> {
  return db.getUser(userId);
}

/**
 * 조건에 맞는 유저 목록을 조회한다.
 * @param nickname 닉네임 LIKE 검색 (null=제한없음)
 * @param fromCreatedAt 생성일시 시작 (null=제한없음)
 * @param toCreatedAt 생성일시 종료 (null=제한없음)
 * @param fromUpdatedAt 수정일시 시작 (null=제한없음)
 * @param toUpdatedAt 수정일시 종료 (null=제한없음)
 * @returns 유저 목록
 */
export async function getUserList(
  nickname: string | null,
  fromCreatedAt: string | null,
  toCreatedAt: string | null,
  fromUpdatedAt: string | null,
  toUpdatedAt: string | null,
): Promise<UserRow[]> {
  return db.getUserList(nickname, fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt);
}

/**
 * 유저 상태를 변경한다.
 * 유저 미존재 시 DBError(31001), 허용되지 않는 상태값이면 DBError(30003)를 던진다.
 * @param userId 대상 유저 ID
 * @param status 변경할 상태 (1:정상, 2:일시정지, 3:영구정지)
 * @returns 변경된 유저 정보
 */
export async function updateUserStatus(userId: number, status: number): Promise<UserRow> {
  return db.updateUserStatus(userId, status);
}
