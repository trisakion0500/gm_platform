import { APIRow, APIRequestRow, APIResponseRow, ActiveApiRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import { ROLE } from '../constants/roles';
import * as db from '../db/api.db';
import * as audit from './logAudit.service';
import { assertProjectRole } from './projectRole.service';

/**
 * API를 생성한다.
 * @author trisakion
 * @param projectId 소속 프로젝트 ID
 * @param apiCode API 고유 코드
 * @param apiName API 이름
 * @param endpoint 서비스 호출 Endpoint
 * @param description 설명 (없으면 null)
 * @param isRequiredApproval 승인 필요 여부
 * @param responseViewType 응답 표시 방식
 * @param displayOrder 화면 표시 순서
 * @param createdBy 생성자 user_id
 * @param callerRoleCode 생성자 JWT의 전역 role_code (SUPER_ADMIN 외에는 projectId 소속 DEVELOPER 여부를 재검증)
 * @returns 생성된 API 정보
 */
export async function createApi(
  projectId: number,
  apiCode: string,
  apiName: string,
  endpoint: string,
  description: string | null,
  isRequiredApproval: number,
  responseViewType: number,
  displayOrder: number,
  createdBy: number,
  callerRoleCode: number,
): Promise<APIRow> {
  await assertProjectRole(createdBy, callerRoleCode, projectId, [ROLE.DEVELOPER]);
  const after = await db.createApi(projectId, apiCode, apiName, endpoint, description, isRequiredApproval, responseViewType, displayOrder, createdBy);
  audit.logCreateApi(after.project_id, after as unknown as Record<string, unknown>, createdBy);
  return after;
}

/**
 * API 목록을 페이지네이션으로 조회한다.
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param status 상태 필터 (null=전체)
 * @param apiStage 운영 단계 필터 (null=전체)
 * @param page 페이지 번호
 * @param pageSize 페이지 크기
 * @param callerRoleCode 요청자 역할 코드
 * @param callerUserId 요청자 user_id
 * @returns { total_count, items }
 */
export async function getApiList(
  projectId: number,
  status: number | null,
  apiStage: number | null,
  page: number,
  pageSize: number,
  callerRoleCode: number,
  callerUserId: number,
): Promise<{ total_count: number; items: APIRow[] }> {
  return db.getApiList(projectId, status, apiStage, page, pageSize, callerRoleCode, callerUserId);
}

/**
 * 사이드바 API 메뉴용 활성 API 전체를 조회한다 (페이지네이션 없음).
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param callerRoleCode 요청자 역할 코드
 * @param callerUserId 요청자 user_id
 * @returns 활성 API 목록
 */
export async function getActiveApis(
  projectId: number,
  callerRoleCode: number,
  callerUserId: number,
): Promise<ActiveApiRow[]> {
  return db.getActiveApis(projectId, callerRoleCode, callerUserId);
}

/**
 * API 단건을 조회한다. 미존재 시 AppError(31006)를 던진다.
 * @author trisakion
 * @param apiId 조회할 API ID
 * @returns { api, requests, responses }
 */
export async function getApi(
  apiId: number,
): Promise<{ api: APIRow; requests: APIRequestRow[]; responses: APIResponseRow[] }> {
  const result = await db.getApi(apiId);
  if (!result)
    throw toAppError(ERROR_MAP.API_NOT_FOUND);
  return result;
}

/**
 * API 정보를 수정한다.
 * @author trisakion
 * @param apiId 수정할 API ID
 * @param apiCode API 고유 코드 (null=변경 없음)
 * @param apiName API 이름 (null=변경 없음)
 * @param endpoint Endpoint (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param apiStage 운영 단계 (null=변경 없음)
 * @param isRequiredApproval 승인 필요 여부 (null=변경 없음)
 * @param responseViewType 응답 표시 방식 (null=변경 없음)
 * @param displayOrder 화면 표시 순서 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param updatedBy 수정자 user_id
 * @param callerRoleCode 수정자 JWT의 전역 role_code (SUPER_ADMIN 외에는 해당 API 소속 프로젝트의 DEVELOPER 여부를 재검증)
 * @returns 수정된 API 정보
 */
export async function updateApi(
  apiId: number,
  apiCode: string | null,
  apiName: string | null,
  endpoint: string | null,
  description: string | null,
  apiStage: number | null,
  isRequiredApproval: number | null,
  responseViewType: number | null,
  displayOrder: number | null,
  status: number | null,
  updatedBy: number,
  callerRoleCode: number,
): Promise<APIRow> {
  const beforeResult = await db.getApi(apiId);
  if (!beforeResult)
    throw toAppError(ERROR_MAP.API_NOT_FOUND);
  await assertProjectRole(updatedBy, callerRoleCode, beforeResult.api.project_id, [ROLE.DEVELOPER]);
  const after = await db.updateApi(apiId, apiCode, apiName, endpoint, description, apiStage, isRequiredApproval, responseViewType, displayOrder, status, updatedBy);
  audit.logUpdateApi(after.project_id,
    beforeResult.api as unknown as Record<string, unknown>,
    after            as unknown as Record<string, unknown>,
    updatedBy);
  return after;
}

/**
 * API Request 파라미터를 생성한다.
 * @author trisakion
 * @param apiId 소속 API ID
 * @param parameterName 파라미터명
 * @param parameterLabel 화면 표시명
 * @param parameterType 데이터 타입
 * @param componentType 입력 컴포넌트 타입
 * @param codeGroupId 코드 그룹 ID
 * @param isRequired 필수 여부
 * @param description 설명 (없으면 null)
 * @param displayOrder 화면 표시 순서
 * @param createdBy 생성자 user_id
 * @param callerRoleCode 생성자 JWT의 전역 role_code (SUPER_ADMIN 외에는 해당 API 소속 프로젝트의 DEVELOPER 여부를 재검증)
 * @returns 생성된 API Request 파라미터 정보
 */
export async function createApiRequest(
  apiId: number,
  parameterName: string,
  parameterLabel: string,
  parameterType: number,
  componentType: number,
  codeGroupId: number,
  isRequired: number,
  description: string | null,
  displayOrder: number,
  createdBy: number,
  callerRoleCode: number,
): Promise<APIRequestRow> {
  const scope = await audit.resolveApiScope(apiId);
  if (!scope)
    throw toAppError(ERROR_MAP.API_NOT_FOUND);
  await assertProjectRole(createdBy, callerRoleCode, scope.projectId, [ROLE.DEVELOPER]);
  const after = await db.createApiRequest(apiId, parameterName, parameterLabel, parameterType, componentType, codeGroupId, isRequired, description, displayOrder, createdBy);
  audit.logCreateApiRequest(after.api_id, after as unknown as Record<string, unknown>, createdBy);
  return after;
}

/**
 * API Request 파라미터 단건을 조회한다. 미존재 시 AppError(31007)를 던진다.
 * @author trisakion
 * @param apiRequestId 조회할 API Request 파라미터 ID
 * @returns API Request 파라미터 정보
 */
export async function getApiRequest(apiRequestId: number): Promise<APIRequestRow> {
  const result = await db.getApiRequest(apiRequestId);
  if (!result)
    throw toAppError(ERROR_MAP.API_REQUEST_NOT_FOUND);
  return result;
}

/**
 * API Request 파라미터를 수정한다.
 * @author trisakion
 * @param apiRequestId 수정할 API Request 파라미터 ID
 * @param parameterName 파라미터명 (null=변경 없음)
 * @param parameterLabel 화면 표시명 (null=변경 없음)
 * @param parameterType 데이터 타입 (null=변경 없음)
 * @param componentType 입력 컴포넌트 타입 (null=변경 없음)
 * @param codeGroupId 코드 그룹 ID (null=변경 없음)
 * @param isRequired 필수 여부 (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param displayOrder 화면 표시 순서 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param updatedBy 수정자 user_id
 * @param callerRoleCode 수정자 JWT의 전역 role_code (SUPER_ADMIN 외에는 해당 API 소속 프로젝트의 DEVELOPER 여부를 재검증)
 * @returns 수정된 API Request 파라미터 정보
 */
export async function updateApiRequest(
  apiRequestId: number,
  parameterName: string | null,
  parameterLabel: string | null,
  parameterType: number | null,
  componentType: number | null,
  codeGroupId: number | null,
  isRequired: number | null,
  description: string | null,
  displayOrder: number | null,
  status: number | null,
  updatedBy: number,
  callerRoleCode: number,
): Promise<APIRequestRow> {
  const before = await db.getApiRequest(apiRequestId);
  if (!before)
    throw toAppError(ERROR_MAP.API_REQUEST_NOT_FOUND);
  const scope = await audit.resolveApiScope(before.api_id);
  if (!scope)
    throw toAppError(ERROR_MAP.API_NOT_FOUND);
  await assertProjectRole(updatedBy, callerRoleCode, scope.projectId, [ROLE.DEVELOPER]);
  const after = await db.updateApiRequest(apiRequestId, parameterName, parameterLabel, parameterType, componentType, codeGroupId, isRequired, description, displayOrder, status, updatedBy);
  audit.logUpdateApiRequest(after.api_id,
    before as unknown as Record<string, unknown>,
    after  as unknown as Record<string, unknown>,
    updatedBy);
  return after;
}

/**
 * API Response 파라미터를 생성한다.
 * @author trisakion
 * @param apiId 소속 API ID
 * @param parameterName 응답 항목명
 * @param parameterLabel 화면 표시명
 * @param parameterType 데이터 타입
 * @param codeGroupId 코드 그룹 ID
 * @param description 설명 (없으면 null)
 * @param displayOrder 화면 표시 순서
 * @param createdBy 생성자 user_id
 * @param callerRoleCode 생성자 JWT의 전역 role_code (SUPER_ADMIN 외에는 해당 API 소속 프로젝트의 DEVELOPER 여부를 재검증)
 * @returns 생성된 API Response 파라미터 정보
 */
export async function createApiResponse(
  apiId: number,
  parameterName: string,
  parameterLabel: string,
  parameterType: number,
  codeGroupId: number,
  description: string | null,
  displayOrder: number,
  createdBy: number,
  callerRoleCode: number,
): Promise<APIResponseRow> {
  const scope = await audit.resolveApiScope(apiId);
  if (!scope)
    throw toAppError(ERROR_MAP.API_NOT_FOUND);
  await assertProjectRole(createdBy, callerRoleCode, scope.projectId, [ROLE.DEVELOPER]);
  const after = await db.createApiResponse(apiId, parameterName, parameterLabel, parameterType, codeGroupId, description, displayOrder, createdBy);
  audit.logCreateApiResponse(after.api_id, after as unknown as Record<string, unknown>, createdBy);
  return after;
}

/**
 * API Response 파라미터 단건을 조회한다. 미존재 시 AppError(31008)를 던진다.
 * @author trisakion
 * @param apiResponseId 조회할 API Response 파라미터 ID
 * @returns API Response 파라미터 정보
 */
export async function getApiResponse(apiResponseId: number): Promise<APIResponseRow> {
  const result = await db.getApiResponse(apiResponseId);
  if (!result)
    throw toAppError(ERROR_MAP.API_RESPONSE_NOT_FOUND);
  return result;
}

/**
 * API Response 파라미터를 수정한다.
 * @author trisakion
 * @param apiResponseId 수정할 API Response 파라미터 ID
 * @param parameterName 응답 항목명 (null=변경 없음)
 * @param parameterLabel 화면 표시명 (null=변경 없음)
 * @param parameterType 데이터 타입 (null=변경 없음)
 * @param codeGroupId 코드 그룹 ID (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param displayOrder 화면 표시 순서 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param updatedBy 수정자 user_id
 * @param callerRoleCode 수정자 JWT의 전역 role_code (SUPER_ADMIN 외에는 해당 API 소속 프로젝트의 DEVELOPER 여부를 재검증)
 * @returns 수정된 API Response 파라미터 정보
 */
export async function updateApiResponse(
  apiResponseId: number,
  parameterName: string | null,
  parameterLabel: string | null,
  parameterType: number | null,
  codeGroupId: number | null,
  description: string | null,
  displayOrder: number | null,
  status: number | null,
  updatedBy: number,
  callerRoleCode: number,
): Promise<APIResponseRow> {
  const before = await db.getApiResponse(apiResponseId);
  if (!before)
    throw toAppError(ERROR_MAP.API_RESPONSE_NOT_FOUND);
  const scope = await audit.resolveApiScope(before.api_id);
  if (!scope)
    throw toAppError(ERROR_MAP.API_NOT_FOUND);
  await assertProjectRole(updatedBy, callerRoleCode, scope.projectId, [ROLE.DEVELOPER]);
  const after = await db.updateApiResponse(apiResponseId, parameterName, parameterLabel, parameterType, codeGroupId, description, displayOrder, status, updatedBy);
  audit.logUpdateApiResponse(after.api_id,
    before as unknown as Record<string, unknown>,
    after  as unknown as Record<string, unknown>,
    updatedBy);
  return after;
}
