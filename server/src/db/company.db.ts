import { callSP } from '../config/db';
import { CompanyRow, CompanyLookupRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * 회사코드로 활성 회사를 조회한다 (회원가입 화면 전용, 인증 불필요).
 * 미존재/비활성 시 DBError(31001)를 던진다.
 * @author trisakion
 * @param companyCode 조회할 회사 코드
 * @returns { company_id, company_name }
 */
export async function getCompanyByCode(companyCode: string): Promise<CompanyLookupRow> {
  const [status, [data]] = await callSP('SP_GET_COMPANY_BY_CODE', [companyCode]);
  switch (status[0].RESULT) {
    case 31001: throw toDBError(ERROR_MAP.COMPANY_NOT_FOUND);
  }
  return data[0] as unknown as CompanyLookupRow;
}

/**
 * 회사를 생성하고 생성된 회사 정보를 반환한다.
 * company_code 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param companyCode 회사 코드
 * @param companyName 회사명
 * @param description 설명 (없으면 null)
 * @returns 생성된 회사 정보
 */
export async function createCompany(
  companyCode: string,
  companyName: string,
  description: string | null,
): Promise<CompanyRow> {
  const [status, [data]] = await callSP('SP_CREATE_COMPANY', [companyCode, companyName, description]);
  switch (status[0].RESULT) {
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as CompanyRow;
}

/**
 * 회사 목록을 페이지네이션으로 조회한다.
 * SUPER_ADMIN은 전체, DEVELOPER는 본인 소속 회사만 반환한다.
 * @author trisakion
 * @param status 상태 필터 (null=전체)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/30/50/100)
 * @param roleCode 요청자 역할 코드
 * @param companyId 요청자 소속 회사 ID (DEVELOPER 스코핑용)
 * @returns { total_count, items }
 */
export async function getCompanyList(
  status: number | null,
  page: number,
  pageSize: number,
  roleCode: number,
  companyId: number,
): Promise<{ total_count: number; items: CompanyRow[] }> {
  const [, [countRows, itemRows]] = await callSP('SP_GET_COMPANY_LIST', [status, page, pageSize, roleCode, companyId]);
  return {
    total_count: (countRows[0] as unknown as { total_count: number }).total_count,
    items: itemRows as unknown as CompanyRow[],
  };
}

/**
 * 회사 단건을 조회한다.
 * DEVELOPER는 본인 소속 회사만 조회 가능하며, 미존재 또는 접근 불가 시 null을 반환한다.
 * @author trisakion
 * @param companyId 조회할 회사 ID
 * @param roleCode 요청자 역할 코드
 * @param userCompanyId 요청자 소속 회사 ID (DEVELOPER 스코핑용)
 * @returns 회사 정보, 없거나 접근 불가이면 null
 */
export async function getCompany(
  companyId: number,
  roleCode: number,
  userCompanyId: number,
): Promise<CompanyRow | null> {
  const [status, [data]] = await callSP('SP_GET_COMPANY', [companyId, roleCode, userCompanyId]);
  switch (status[0].RESULT) {
    case 31001: return null;
  }
  return data[0] as unknown as CompanyRow;
}

/**
 * 회사 정보를 수정하고 수정된 회사 정보를 반환한다.
 * 회사 미존재 시 DBError(31001), company_code 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param companyId 수정할 회사 ID
 * @param companyCode 회사 코드 (null=변경 없음)
 * @param companyName 회사명 (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @returns 수정된 회사 정보
 */
export async function updateCompany(
  companyId: number,
  companyCode: string | null,
  companyName: string | null,
  description: string | null,
  status: number | null,
): Promise<CompanyRow> {
  const [spStatus, [data]] = await callSP('SP_UPDATE_COMPANY', [companyId, companyCode, companyName, description, status]);
  switch (spStatus[0].RESULT) {
    case 31001: throw toDBError(ERROR_MAP.COMPANY_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as CompanyRow;
}
