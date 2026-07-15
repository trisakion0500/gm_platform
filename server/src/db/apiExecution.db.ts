import { callSP } from '../config/db';
import { APIExecutionRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * API 실행 이력을 생성하고 생성된 이력 + HTTP 호출 정보를 반환한다.
 * api 미존재 시 DBError(31006), api 비활성 시 DBError(30003),
 * api_stage 또는 project 접근 불가 시 DBError(20001)를 던진다.
 * @author trisakion
 * @param apiId 실행할 API ID
 * @param requestUserId 요청자 user_id
 * @param requestJson 요청 파라미터 JSON 문자열
 * @param roleCode 요청자 역할 코드
 * @param companyId 요청자 company_id
 * @returns 생성된 실행 이력 + api_base_url + api_key(암호문, 미발급 시 null) + is_immediate (1=즉시실행, 0=승인대기)
 */
export async function createApiExecution(
  apiId: number,
  requestUserId: number,
  requestJson: string,
  roleCode: number,
  companyId: number,
): Promise<APIExecutionRow & { api_base_url: string; api_key: string | null; is_immediate: number }> {
  const [status, [data]] = await callSP('SP_CREATE_API_EXECUTION', [
    apiId, requestUserId, requestJson, roleCode, companyId,
  ]);
  switch (status[0].RESULT) {
    case 31006: throw toDBError(ERROR_MAP.API_NOT_FOUND);
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
    case 20001: throw toDBError(ERROR_MAP.FORBIDDEN);
  }
  return data[0] as unknown as APIExecutionRow & { api_base_url: string; api_key: string | null; is_immediate: number };
}

/**
 * HTTP 호출 결과를 api_execution 에 반영한다 (status 40/50).
 * @author trisakion
 * @param apiExecutionId 대상 실행 이력 ID
 * @param newStatus 결과 상태 (40=SUCCESS, 50=FAILED)
 * @param responseData 응답 데이터 JSON 문자열 (실패 시 null)
 * @param errorMessage 에러 메시지 (성공 시 null)
 * @returns void
 */
export async function updateApiExecutionResult(
  apiExecutionId: number,
  newStatus: number,
  responseData: string | null,
  errorMessage: string | null,
): Promise<void> {
  await callSP('SP_UPDATE_API_EXECUTION_RESULT', [
    apiExecutionId, newStatus, responseData, errorMessage,
  ]);
}

/**
 * API 실행 이력 목록을 페이지네이션으로 조회한다.
 * OPERATOR의 request_user_id 강제 적용은 서비스 레이어에서 처리한다.
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param apiId API ID 필터 (null=전체)
 * @param requestUserId 요청자 필터 (null=전체)
 * @param status 상태 필터 (null=전체)
 * @param requiredApprovalOnly 승인 필요 건만 필터 (null=전체, 1=승인필요 건만)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/30/50/100)
 * @param callerRoleCode 요청자 역할 코드
 * @param callerCompanyId 요청자 company_id
 * @returns { total_count, items }
 */
export async function getApiExecutionList(
  projectId: number,
  apiId: number | null,
  requestUserId: number | null,
  status: number | null,
  requiredApprovalOnly: number | null,
  page: number,
  pageSize: number,
  callerRoleCode: number,
  callerCompanyId: number,
): Promise<{ total_count: number; items: APIExecutionRow[] }> {
  const [, [countRows, itemRows]] = await callSP('SP_GET_API_EXECUTION_LIST', [
    projectId, apiId, requestUserId, status, requiredApprovalOnly, page, pageSize, callerRoleCode, callerCompanyId,
  ]);
  return {
    total_count: (countRows[0] as unknown as { total_count: number }).total_count,
    items: itemRows as unknown as APIExecutionRow[],
  };
}

/**
 * 승인 대기(status=10) 목록을 페이지네이션으로 조회한다.
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/30/50/100)
 * @param callerRoleCode 요청자 역할 코드
 * @param callerCompanyId 요청자 company_id
 * @returns { total_count, items }
 */
export async function getApiExecutionPending(
  projectId: number,
  page: number,
  pageSize: number,
  callerRoleCode: number,
  callerCompanyId: number,
): Promise<{ total_count: number; items: APIExecutionRow[] }> {
  const [, [countRows, itemRows]] = await callSP('SP_GET_API_EXECUTION_PENDING', [
    projectId, page, pageSize, callerRoleCode, callerCompanyId,
  ]);
  return {
    total_count: (countRows[0] as unknown as { total_count: number }).total_count,
    items: itemRows as unknown as APIExecutionRow[],
  };
}

/**
 * API 실행 이력 단건을 조회한다.
 * OPERATOR는 본인 요청 건만, 비SUPER_ADMIN은 자신의 company 프로젝트만 조회 가능하다.
 * 미존재 시 null, 접근 불가 시 DBError(20001)를 던진다.
 * @author trisakion
 * @param apiExecutionId 조회할 실행 이력 ID
 * @param callerRoleCode 요청자 역할 코드
 * @param callerUserId 요청자 user_id
 * @param callerCompanyId 요청자 company_id
 * @returns 실행 이력 상세, 없으면 null
 */
export async function getApiExecution(
  apiExecutionId: number,
  callerRoleCode: number,
  callerUserId: number,
  callerCompanyId: number,
): Promise<APIExecutionRow | null> {
  const [status, [data]] = await callSP('SP_GET_API_EXECUTION', [
    apiExecutionId, callerRoleCode, callerUserId, callerCompanyId,
  ]);
  switch (status[0].RESULT) {
    case 31009: return null;
    case 20001: throw toDBError(ERROR_MAP.FORBIDDEN);
  }
  return data[0] as unknown as APIExecutionRow;
}

/**
 * 실행 이력을 승인(10→20)하고 승인된 이력 + api_base_url을 반환한다.
 * 미존재 시 null, status=10이 아닌 경우 DBError(30003)를 던진다.
 * SUPER_ADMIN 외에는 대상 프로젝트에 DEVELOPER/APPROVER 활성 권한이 없으면 null(31009, 이력 존재 자체를 숨김).
 * @author trisakion
 * @param apiExecutionId 승인할 실행 이력 ID
 * @param approveUserId 승인자 user_id
 * @param callerRoleCode 승인자 역할 코드 (대상 프로젝트 재검증용)
 * @returns 승인된 실행 이력 + api_base_url + api_key(암호문, 미발급 시 null), 없으면 null
 */
export async function approveApiExecution(
  apiExecutionId: number,
  approveUserId: number,
  callerRoleCode: number,
): Promise<APIExecutionRow & { api_base_url: string; api_key: string | null } | null> {
  const [status, [data]] = await callSP('SP_APPROVE_API_EXECUTION', [
    apiExecutionId, approveUserId, callerRoleCode,
  ]);
  switch (status[0].RESULT) {
    case 31009: return null;
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
  }
  return data[0] as unknown as APIExecutionRow & { api_base_url: string; api_key: string | null };
}

/**
 * 실행 이력을 반려(10→30)하고 반려된 이력을 반환한다.
 * 미존재 시 null, status=10이 아닌 경우 DBError(30003)를 던진다.
 * SUPER_ADMIN 외에는 대상 프로젝트에 DEVELOPER/APPROVER 활성 권한이 없으면 null(31009, 이력 존재 자체를 숨김).
 * @author trisakion
 * @param apiExecutionId 반려할 실행 이력 ID
 * @param approveUserId 반려자 user_id
 * @param rejectReason 반려 사유
 * @param callerRoleCode 반려자 역할 코드 (대상 프로젝트 재검증용)
 * @returns 반려된 실행 이력, 없으면 null
 */
export async function rejectApiExecution(
  apiExecutionId: number,
  approveUserId: number,
  rejectReason: string,
  callerRoleCode: number,
): Promise<APIExecutionRow | null> {
  const [status, [data]] = await callSP('SP_REJECT_API_EXECUTION', [
    apiExecutionId, approveUserId, rejectReason, callerRoleCode,
  ]);
  switch (status[0].RESULT) {
    case 31009: return null;
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
  }
  return data[0] as unknown as APIExecutionRow;
}

/**
 * 실행 이력을 취소(10→60)하고 취소된 이력을 반환한다.
 * 미존재 시 null, status=10이 아닌 경우 DBError(30003),
 * 본인 요청 건이 아닌 경우 DBError(20001)를 던진다.
 * @author trisakion
 * @param apiExecutionId 취소할 실행 이력 ID
 * @param callerUserId 취소 요청자 user_id
 * @param rejectReason 취소 사유
 * @returns 취소된 실행 이력, 없으면 null
 */
export async function cancelApiExecution(
  apiExecutionId: number,
  callerUserId: number,
  rejectReason: string,
): Promise<APIExecutionRow | null> {
  const [status, [data]] = await callSP('SP_CANCEL_API_EXECUTION', [
    apiExecutionId, callerUserId, rejectReason,
  ]);
  switch (status[0].RESULT) {
    case 31009: return null;
    case 30003: throw toDBError(ERROR_MAP.INVALID_VALUE);
    case 20001: throw toDBError(ERROR_MAP.FORBIDDEN);
  }
  return data[0] as unknown as APIExecutionRow;
}
