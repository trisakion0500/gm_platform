import { callSP } from '../config/db';
import { CodeItemRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * 코드 아이템을 생성하고 생성된 코드 아이템 정보를 반환한다.
 * code_group 미존재/비활성 시 DBError(31004), code_value 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param codeGroupId 소속 코드 그룹 ID
 * @param codeValue 코드 값
 * @param codeName 코드명
 * @param description 설명 (없으면 null)
 * @param displayOrder 화면 표시 순서
 * @param createdBy 생성자 user_id
 * @returns 생성된 코드 아이템 정보
 */
export async function createCodeItem(
  codeGroupId: number,
  codeValue: string,
  codeName: string,
  description: string | null,
  displayOrder: number,
  createdBy: number,
): Promise<CodeItemRow> {
  const [status, [data]] = await callSP('SP_CREATE_CODE_ITEM', [codeGroupId, codeValue, codeName, description, displayOrder, createdBy]);
  switch (status[0].RESULT) {
    case 31004: throw toDBError(ERROR_MAP.CODE_GROUP_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as CodeItemRow;
}

/**
 * 코드 그룹의 코드 아이템 목록을 반환한다.
 * @author trisakion
 * @param codeGroupId 소속 코드 그룹 ID
 * @param status 상태 필터 (null=전체)
 * @returns 코드 아이템 목록
 */
export async function getCodeItemList(
  codeGroupId: number,
  status: number | null,
): Promise<CodeItemRow[]> {
  const [, [data]] = await callSP('SP_GET_CODE_ITEM_LIST', [codeGroupId, status]);
  return data as unknown as CodeItemRow[];
}

/**
 * 코드 아이템 단건을 조회한다. 미존재 시 null을 반환한다.
 * @author trisakion
 * @param codeItemId 조회할 코드 아이템 ID
 * @returns 코드 아이템 정보, 없으면 null
 */
export async function getCodeItem(codeItemId: number): Promise<CodeItemRow | null> {
  const [status, [data]] = await callSP('SP_GET_CODE_ITEM', [codeItemId]);
  if (status[0].RESULT === 31005)
    return null;
  return data[0] as unknown as CodeItemRow;
}

/**
 * 코드 아이템 정보를 수정하고 수정된 정보를 반환한다.
 * 코드 아이템 미존재 시 DBError(31005)를 던진다.
 * @author trisakion
 * @param codeItemId 수정할 코드 아이템 ID
 * @param codeName 코드명 (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param displayOrder 화면 표시 순서 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param updatedBy 수정자 user_id
 * @returns 수정된 코드 아이템 정보
 */
export async function updateCodeItem(
  codeItemId: number,
  codeName: string | null,
  description: string | null,
  displayOrder: number | null,
  status: number | null,
  updatedBy: number,
): Promise<CodeItemRow> {
  const [spStatus, [data]] = await callSP('SP_UPDATE_CODE_ITEM', [codeItemId, codeName, description, displayOrder, status, updatedBy]);
  if (spStatus[0].RESULT === 31005)
    throw toDBError(ERROR_MAP.CODE_ITEM_NOT_FOUND);
  return data[0] as unknown as CodeItemRow;
}
