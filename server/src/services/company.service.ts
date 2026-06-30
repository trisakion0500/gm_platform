import { CompanyRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import * as db from '../db/company.db';

/**
 * 회사를 생성한다.
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
  return db.createCompany(companyCode, companyName, description);
}

/**
 * 회사 목록을 페이지네이션으로 조회한다.
 * @author trisakion
 * @param status 상태 필터 (null=전체)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/50/100)
 * @param roleCode 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
 * @param companyId 요청자 소속 회사 ID (DEVELOPER 스코핑용)
 * @returns 페이지네이션 응답 { page, page_size, total_count, items }
 */
export async function getCompanyList(
  status: number | null,
  page: number,
  pageSize: number,
  roleCode: number,
  companyId: number,
): Promise<{ page: number; page_size: number; total_count: number; items: CompanyRow[] }> {
  const result = await db.getCompanyList(status, page, pageSize, roleCode, companyId);
  return { page, page_size: pageSize, ...result };
}

/**
 * 회사 단건을 조회한다. 존재하지 않거나 접근 불가 시 AppError(31001)를 던진다.
 * @author trisakion
 * @param companyId 조회할 회사 ID
 * @param roleCode 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
 * @param userCompanyId 요청자 소속 회사 ID (DEVELOPER 스코핑용)
 * @returns 회사 정보
 */
export async function getCompany(
  companyId: number,
  roleCode: number,
  userCompanyId: number,
): Promise<CompanyRow> {
  const company = await db.getCompany(companyId, roleCode, userCompanyId);
  if (!company)
    throw toAppError(ERROR_MAP.COMPANY_NOT_FOUND);
  return company;
}

/**
 * 회사 정보를 수정한다.
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
  return db.updateCompany(companyId, companyCode, companyName, description, status);
}
