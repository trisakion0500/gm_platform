import { callSP } from '../config/db';
import { APIRow, APIRequestRow, APIResponseRow, ActiveApiRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * API를 생성하고 생성된 API 정보를 반환한다.
 * project 미존재 시 DBError(31002), api_code 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param projectId 소속 프로젝트 ID
 * @param apiCode API 고유 코드
 * @param apiName API 이름
 * @param endpoint 서비스 호출 Endpoint
 * @param description 설명 (없으면 null)
 * @param isRequiredApproval 승인 필요 여부 (0:즉시실행, 1:승인필요)
 * @param responseViewType 응답 표시 방식 (1:KEY_VALUE, 2:GRID)
 * @param displayOrder 화면 표시 순서
 * @param createdBy 생성자 user_id
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
): Promise<APIRow> {
  const [status, [data]] = await callSP('SP_CREATE_API', [
    projectId, apiCode, apiName, endpoint, description,
    isRequiredApproval, responseViewType, displayOrder, createdBy,
  ]);
  switch (status[0].RESULT) {
    case 31002: throw toDBError(ERROR_MAP.PROJECT_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as APIRow;
}

/**
 * API 목록을 페이지네이션으로 조회한다.
 * SUPER_ADMIN은 전체, 일반 사용자는 권한 있는 프로젝트만 조회 가능하다. 미권한 시 DBError(20001)를 던진다.
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param status 상태 필터 (null=전체)
 * @param apiStage 운영 단계 필터 (null=전체)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/30/50/100)
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
  const [spStatus, [countRows, itemRows]] = await callSP('SP_GET_API_LIST', [
    projectId, status, apiStage, page, pageSize, callerRoleCode, callerUserId,
  ]);
  if (spStatus[0].RESULT === 20001)
    throw toDBError(ERROR_MAP.FORBIDDEN);
  return {
    total_count: (countRows[0] as unknown as { total_count: number }).total_count,
    items: itemRows as unknown as APIRow[],
  };
}

/**
 * 사이드바 API 메뉴용 활성 API 전체를 조회한다 (페이지네이션 없음).
 * SUPER_ADMIN은 전체, 일반 사용자는 권한 있는 프로젝트만 조회 가능하다. 미권한 시 DBError(20001)를 던진다.
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
  const [status, [items]] = await callSP('SP_GET_ACTIVE_APIS', [projectId, callerRoleCode, callerUserId]);
  if (status[0].RESULT === 20001)
    throw toDBError(ERROR_MAP.FORBIDDEN);
  return items as unknown as ActiveApiRow[];
}

/**
 * API 단건을 조회한다. api, api_request 목록, api_response 목록을 함께 반환한다.
 * SUPER_ADMIN 외에는 해당 API 소속 프로젝트에 활성 user_role이 없으면 미존재로 처리된다.
 * 미존재 또는 접근 불가 시 null을 반환한다.
 * @author trisakion
 * @param apiId 조회할 API ID
 * @param callerRoleCode 요청자 역할 코드 (프로젝트 스코핑용)
 * @param callerUserId 요청자 user_id (프로젝트 스코핑용)
 * @returns { api, requests, responses }, 없으면 null
 */
export async function getApi(
  apiId: number,
  callerRoleCode: number,
  callerUserId: number,
): Promise<{ api: APIRow; requests: APIRequestRow[]; responses: APIResponseRow[] } | null> {
  const [status, [apiRows, requestRows, responseRows]] = await callSP('SP_GET_API', [apiId, callerRoleCode, callerUserId]);
  if (status[0].RESULT === 31006)
    return null;
  return {
    api: apiRows[0] as unknown as APIRow,
    requests: (requestRows ?? []) as unknown as APIRequestRow[],
    responses: (responseRows ?? []) as unknown as APIResponseRow[],
  };
}

/**
 * API 정보를 수정하고 수정된 API 정보를 반환한다.
 * 미존재 시 DBError(31006), api_code 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param apiId 수정할 API ID
 * @param apiCode API 고유 코드 (null=변경 없음)
 * @param apiName API 이름 (null=변경 없음)
 * @param endpoint Endpoint (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param apiStage 운영 단계 (null=변경 없음, 롤백 트리거 시 무시됨)
 * @param isRequiredApproval 승인 필요 여부 (null=변경 없음)
 * @param responseViewType 응답 표시 방식 (null=변경 없음)
 * @param displayOrder 화면 표시 순서 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param updatedBy 수정자 user_id
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
): Promise<APIRow> {
  const [spStatus, [data]] = await callSP('SP_UPDATE_API', [
    apiId, apiCode, apiName, endpoint, description,
    apiStage, isRequiredApproval, responseViewType, displayOrder, status, updatedBy,
  ]);
  switch (spStatus[0].RESULT) {
    case 31006: throw toDBError(ERROR_MAP.API_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as APIRow;
}

/**
 * API Request 파라미터를 생성하고 생성된 정보를 반환한다.
 * api 미존재 시 DBError(31006), component_type(5/6/7) + code_group_id=0 시 DBError(30003),
 * parameter_name 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param apiId 소속 API ID
 * @param parameterName 파라미터명 (JSON Key)
 * @param parameterLabel 화면 표시명
 * @param parameterType 데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON)
 * @param componentType 입력 컴포넌트 (1:TEXT, 2:NUMBER, 3:DATE, 4:DATETIME, 5:SELECT, 6:RADIO, 7:CHECKBOX)
 * @param codeGroupId 코드 그룹 ID (0:사용안함, component_type 5/6/7 시 필수)
 * @param isRequired 필수 여부 (0:선택, 1:필수)
 * @param description 설명 (없으면 null)
 * @param displayOrder 화면 표시 순서
 * @param createdBy 생성자 user_id
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
): Promise<APIRequestRow> {
  const [status, [data]] = await callSP('SP_CREATE_API_REQUEST', [
    apiId, parameterName, parameterLabel, parameterType,
    componentType, codeGroupId, isRequired, description, displayOrder, createdBy,
  ]);
  switch (status[0].RESULT) {
    case 31006: throw toDBError(ERROR_MAP.API_NOT_FOUND);
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as APIRequestRow;
}

/**
 * API Request 파라미터 단건을 조회한다.
 * SUPER_ADMIN 외에는 소속 API의 프로젝트에 활성 user_role이 없으면 미존재로 처리된다.
 * 미존재 또는 접근 불가 시 null을 반환한다.
 * @author trisakion
 * @param apiRequestId 조회할 API Request 파라미터 ID
 * @param callerRoleCode 요청자 역할 코드 (프로젝트 스코핑용)
 * @param callerUserId 요청자 user_id (프로젝트 스코핑용)
 * @returns API Request 파라미터 정보, 없으면 null
 */
export async function getApiRequest(
  apiRequestId: number,
  callerRoleCode: number,
  callerUserId: number,
): Promise<APIRequestRow | null> {
  const [status, [data]] = await callSP('SP_GET_API_REQUEST', [apiRequestId, callerRoleCode, callerUserId]);
  if (status[0].RESULT === 31007)
    return null;
  return data[0] as unknown as APIRequestRow;
}

/**
 * API Request 파라미터를 수정하고 수정된 정보를 반환한다.
 * 미존재 시 DBError(31007), parameter_name 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param apiRequestId 수정할 API Request 파라미터 ID
 * @param parameterName 파라미터명 (null=변경 없음)
 * @param parameterLabel 화면 표시명 (null=변경 없음)
 * @param parameterType 데이터 타입 (null=변경 없음)
 * @param componentType 입력 컴포넌트 (null=변경 없음)
 * @param codeGroupId 코드 그룹 ID (null=변경 없음)
 * @param isRequired 필수 여부 (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param displayOrder 화면 표시 순서 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param updatedBy 수정자 user_id
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
): Promise<APIRequestRow> {
  const [spStatus, [data]] = await callSP('SP_UPDATE_API_REQUEST', [
    apiRequestId, parameterName, parameterLabel, parameterType,
    componentType, codeGroupId, isRequired, description, displayOrder, status, updatedBy,
  ]);
  switch (spStatus[0].RESULT) {
    case 31007: throw toDBError(ERROR_MAP.API_REQUEST_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as APIRequestRow;
}

/**
 * API Response 파라미터를 생성하고 생성된 정보를 반환한다.
 * api 미존재 시 DBError(31006), parameter_name 중복 시 DBError(32001)를 던진다.
 * @author trisakion
 * @param apiId 소속 API ID
 * @param parameterName 응답 항목명 (JSON Key)
 * @param parameterLabel 화면 표시명
 * @param parameterType 데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON)
 * @param codeGroupId 코드 그룹 ID (0:사용안함)
 * @param description 설명 (없으면 null)
 * @param displayOrder 화면 표시 순서
 * @param createdBy 생성자 user_id
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
): Promise<APIResponseRow> {
  const [status, [data]] = await callSP('SP_CREATE_API_RESPONSE', [
    apiId, parameterName, parameterLabel, parameterType,
    codeGroupId, description, displayOrder, createdBy,
  ]);
  switch (status[0].RESULT) {
    case 31006: throw toDBError(ERROR_MAP.API_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as APIResponseRow;
}

/**
 * API Response 파라미터 단건을 조회한다.
 * SUPER_ADMIN 외에는 소속 API의 프로젝트에 활성 user_role이 없으면 미존재로 처리된다.
 * 미존재 또는 접근 불가 시 null을 반환한다.
 * @author trisakion
 * @param apiResponseId 조회할 API Response 파라미터 ID
 * @param callerRoleCode 요청자 역할 코드 (프로젝트 스코핑용)
 * @param callerUserId 요청자 user_id (프로젝트 스코핑용)
 * @returns API Response 파라미터 정보, 없으면 null
 */
export async function getApiResponse(
  apiResponseId: number,
  callerRoleCode: number,
  callerUserId: number,
): Promise<APIResponseRow | null> {
  const [status, [data]] = await callSP('SP_GET_API_RESPONSE', [apiResponseId, callerRoleCode, callerUserId]);
  if (status[0].RESULT === 31008)
    return null;
  return data[0] as unknown as APIResponseRow;
}

/**
 * API Response 파라미터를 수정하고 수정된 정보를 반환한다.
 * 미존재 시 DBError(31008), parameter_name 중복 시 DBError(32001)를 던진다.
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
): Promise<APIResponseRow> {
  const [spStatus, [data]] = await callSP('SP_UPDATE_API_RESPONSE', [
    apiResponseId, parameterName, parameterLabel, parameterType,
    codeGroupId, description, displayOrder, status, updatedBy,
  ]);
  switch (spStatus[0].RESULT) {
    case 31008: throw toDBError(ERROR_MAP.API_RESPONSE_NOT_FOUND);
    case 32001: throw toDBError(ERROR_MAP.DUPLICATE_VALUE);
  }
  return data[0] as unknown as APIResponseRow;
}
