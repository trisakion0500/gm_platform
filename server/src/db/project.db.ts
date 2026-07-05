import { callSP } from '../config/db';
import { ProjectRow, ProjectLookupRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * 프로젝트코드로 활성 프로젝트를 조회한다 (회원가입 화면 전용, 인증 불필요).
 * 미존재/비활성/타사 소속 시 DBError(31002)를 던진다.
 * @author trisakion
 * @param companyId 소속 회사 ID (먼저 확인된 company_id)
 * @param projectCode 조회할 프로젝트 코드
 * @returns { project_id, project_name }
 */
export async function getProjectByCode(companyId: number, projectCode: string): Promise<ProjectLookupRow> {
  const [status, [data]] = await callSP('SP_GET_PROJECT_BY_CODE', [companyId, projectCode]);
  switch (status[0].RESULT) {
    case 31002: throw toDBError(ERROR_MAP.PROJECT_NOT_FOUND);
  }
  return data[0] as unknown as ProjectLookupRow;
}

/**
 * 프로젝트를 생성하고 생성된 프로젝트 정보를 반환한다.
 * company 미존재 시 DBError(31001), project_code 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param companyId 소속 회사 ID
 * @param projectCode 프로젝트 코드
 * @param projectName 프로젝트명
 * @param apiBaseUrl API Base URL
 * @param description 설명 (없으면 null)
 * @returns 생성된 프로젝트 정보 (company 정보 포함)
 */
export async function createProject(
  companyId: number,
  projectCode: string,
  projectName: string,
  apiBaseUrl: string,
  description: string | null,
): Promise<ProjectRow> {
  const [status, [data]] = await callSP('SP_CREATE_PROJECT', [companyId, projectCode, projectName, apiBaseUrl, description]);
  switch (status[0].RESULT) {
    case 31001: throw toDBError(ERROR_MAP.COMPANY_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as ProjectRow;
}

/**
 * 프로젝트 목록을 페이지네이션으로 조회한다.
 * SUPER_ADMIN은 전체, 그 외는 본인이 활성 user_role을 가진 프로젝트만 반환한다.
 * @author trisakion
 * @param companyId 회사 ID 필터 (null=전체)
 * @param status 상태 필터 (null=전체)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/30/50/100)
 * @param roleCode 요청자 역할 코드
 * @param userId 요청자 user_id (스코핑용)
 * @returns { total_count, items }
 */
export async function getProjectList(
  companyId: number | null,
  status: number | null,
  page: number,
  pageSize: number,
  roleCode: number,
  userId: number,
): Promise<{ total_count: number; items: ProjectRow[] }> {
  const [, [countRows, itemRows]] = await callSP('SP_GET_PROJECT_LIST', [companyId, status, page, pageSize, roleCode, userId]);
  return {
    total_count: (countRows[0] as unknown as { total_count: number }).total_count,
    items: itemRows as unknown as ProjectRow[],
  };
}

/**
 * 프로젝트 단건을 조회한다.
 * 미존재 또는 접근 불가 시 null을 반환한다.
 * @author trisakion
 * @param projectId 조회할 프로젝트 ID
 * @param roleCode 요청자 역할 코드
 * @param userId 요청자 user_id (스코핑용)
 * @returns 프로젝트 정보 (company 정보 포함), 없거나 접근 불가이면 null
 */
export async function getProject(
  projectId: number,
  roleCode: number,
  userId: number,
): Promise<ProjectRow | null> {
  const [status, [data]] = await callSP('SP_GET_PROJECT', [projectId, roleCode, userId]);
  switch (status[0].RESULT) {
    case 31002: return null;
  }
  return data[0] as unknown as ProjectRow;
}

/**
 * 프로젝트 정보를 수정하고 수정된 프로젝트 정보를 반환한다.
 * 프로젝트 미존재 시 DBError(31002), project_code 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param projectId 수정할 프로젝트 ID
 * @param projectCode 프로젝트 코드 (null=변경 없음)
 * @param projectName 프로젝트명 (null=변경 없음)
 * @param apiBaseUrl API Base URL (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @returns 수정된 프로젝트 정보 (company 정보 포함)
 */
export async function updateProject(
  projectId: number,
  projectCode: string | null,
  projectName: string | null,
  apiBaseUrl: string | null,
  description: string | null,
  status: number | null,
): Promise<ProjectRow> {
  const [spStatus, [data]] = await callSP('SP_UPDATE_PROJECT', [projectId, projectCode, projectName, apiBaseUrl, description, status]);
  switch (spStatus[0].RESULT) {
    case 31002: throw toDBError(ERROR_MAP.PROJECT_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as ProjectRow;
}
