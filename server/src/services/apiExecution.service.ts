import axios from 'axios';
import { APIExecutionRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import { env } from '../config/env';
import * as db from '../db/apiExecution.db';
import logger from '../utils/logger';
import { decrypt } from '../utils/crypto';

/**
 * 외부 API를 HTTP POST로 호출하고 결과를 api_execution에 반영한다.
 * 10초 타임아웃 초과 시 error_message = 'Timeout Response' 로 FAILED 처리한다.
 * HTTP 자체는 200이어도 외부 API가 자체 응답 규약({ result, message, data })의 result를
 * 0이 아닌 값으로 내려주면 비즈니스 실패로 간주해 FAILED 처리하고 message를 error_message에 담는다.
 * 이 함수는 절대 throw하지 않는다 — 호출 실패를 예외로 전파하면 실행 이력이
 * PENDING(10) 또는 APPROVED(20) 상태에 영구적으로 갇히기 때문이다.
 * @param executionId 실행 이력 ID
 * @param url 호출 URL (api_base_url + endpoint)
 * @param body 요청 본문 (parsed object)
 * @param encryptedApiKey project.api_key 암호문 (미발급 시 null — 이 경우 헤더 없이 기존 동작 그대로 호출)
 */
async function callExternalApi(executionId: number, url: string, body: unknown, encryptedApiKey: string | null): Promise<void> {
  try {
    const headers = encryptedApiKey ? { 'X-API-Key': decrypt(encryptedApiKey) } : undefined;
    const response = await axios.post(url, body, { timeout: env.apiExecutionTimeoutMs, headers });
    const resultCode = response.data?.result;
    if (resultCode !== undefined && resultCode !== 0) {
      const msg = typeof response.data?.message === 'string' ? response.data.message : `외부 API 오류 (result=${resultCode})`;
      await db.updateApiExecutionResult(executionId, 50, null, msg);
      return;
    }
    await db.updateApiExecutionResult(executionId, 40, JSON.stringify(response.data), null);
  } catch (err: any) {
    // err 객체 자체·JSON.stringify(err)는 절대 로깅하지 않는다 — axios 에러는 config.headers(인증 헤더 평문)를 담고 있다. err.stack만 사용.
    const isTimeout = axios.isAxiosError(err) && (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED');
    // 4xx/5xx 등 HTTP 에러 상태코드로 떨어진 경우, 외부 API가 응답 규약({ result, message, data })대로 body에 실어보낸 message를
    // 우선 사용한다 — 없으면(네트워크 오류 등 응답 자체가 없는 경우) axios의 범용 메시지로 폴백.
    const responseMessage = axios.isAxiosError(err) && typeof err.response?.data?.message === 'string' ? err.response.data.message : null;
    const msg = isTimeout ? 'Timeout Response' : responseMessage ?? String(err.message ?? 'Unknown error');
    logger.error(`외부 API 호출 실패 (execution ${executionId}): ${msg}`, err.stack);
    await db.updateApiExecutionResult(executionId, 50, null, msg);
  }
}

/**
 * API 실행을 요청한다.
 * is_immediate=1 이면 즉시 HTTP 호출 후 최종 상태를 반환하고,
 * is_immediate=0 이면 PENDING(10) 상태의 실행 이력을 반환한다.
 * @author trisakion
 * @param apiId 실행할 API ID
 * @param requestUserId 요청자 user_id
 * @param requestJson 요청 파라미터 (parsed object)
 * @param roleCode 요청자 역할 코드
 * @param companyId 요청자 company_id
 * @returns 실행 이력 (즉시실행 시 최종 상태, 승인대기 시 PENDING)
 */
export async function executeApi(
  apiId: number,
  requestUserId: number,
  requestJson: unknown,
  roleCode: number,
  companyId: number,
): Promise<APIExecutionRow> {
  const row = await db.createApiExecution(apiId, requestUserId, JSON.stringify(requestJson), roleCode, companyId);
  const { api_base_url, api_key, is_immediate, ...execution } = row;

  if (is_immediate === 1) {
    await callExternalApi(row.api_execution_id, api_base_url + row.endpoint, requestJson, api_key);
    return (await db.getApiExecution(row.api_execution_id, roleCode, requestUserId))!;
  }

  return execution as APIExecutionRow;
}

/**
 * API 실행 이력 목록을 조회한다.
 * SUPER_ADMIN 외에는 대상 프로젝트에 대한 실제 활성 user_role이 있어야 조회 가능하다.
 * OPERATOR는 request_user_id가 본인 ID로 강제된다.
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param apiId API ID 필터 (null=전체)
 * @param requestUserId 요청자 필터 (null=전체, OPERATOR는 호출 전 강제 적용)
 * @param status 상태 필터 (null=전체)
 * @param requiredApprovalOnly 승인 필요 건만 필터 (null=전체, 1=승인필요 건만)
 * @param page 페이지 번호
 * @param pageSize 페이지 크기
 * @param roleCode 요청자 역할 코드
 * @param userId 요청자 user_id
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
  roleCode: number,
  userId: number,
): Promise<{ total_count: number; items: APIExecutionRow[] }> {
  return db.getApiExecutionList(projectId, apiId, requestUserId, status, requiredApprovalOnly, page, pageSize, roleCode, userId);
}

/**
 * 승인 대기(PENDING) 목록을 조회한다.
 * SUPER_ADMIN 외에는 대상 프로젝트에 대한 실제 활성 user_role이 있어야 조회 가능하다.
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param page 페이지 번호
 * @param pageSize 페이지 크기
 * @param roleCode 요청자 역할 코드
 * @param userId 요청자 user_id
 * @returns { total_count, items }
 */
export async function getApiExecutionPending(
  projectId: number,
  page: number,
  pageSize: number,
  roleCode: number,
  userId: number,
): Promise<{ total_count: number; items: APIExecutionRow[] }> {
  return db.getApiExecutionPending(projectId, page, pageSize, roleCode, userId);
}

/**
 * API 실행 이력 단건을 조회한다. 미존재 시 AppError(31009)를 던진다.
 * @author trisakion
 * @param executionId 실행 이력 ID
 * @param roleCode 요청자 역할 코드
 * @param userId 요청자 user_id
 * @returns 실행 이력 상세
 */
export async function getApiExecution(
  executionId: number,
  roleCode: number,
  userId: number,
): Promise<APIExecutionRow> {
  const result = await db.getApiExecution(executionId, roleCode, userId);
  if (!result)
    throw toAppError(ERROR_MAP.API_EXECUTION_NOT_FOUND);
  return result;
}

/**
 * 실행 이력을 승인(10→20)하고 즉시 HTTP 호출한다.
 * 미존재 시 AppError(31009)를 던진다.
 * @author trisakion
 * @param executionId 실행 이력 ID
 * @param approveUserId 승인자 user_id
 * @param callerRoleCode 승인자 역할 코드
 * @returns HTTP 호출 후 최종 실행 이력
 */
export async function approveApiExecution(
  executionId: number,
  approveUserId: number,
  callerRoleCode: number,
): Promise<APIExecutionRow> {
  const row = await db.approveApiExecution(executionId, approveUserId, callerRoleCode);
  if (!row)
    throw toAppError(ERROR_MAP.API_EXECUTION_NOT_FOUND);

  const { api_base_url, api_key, ...execution } = row;
  await callExternalApi(executionId, api_base_url + execution.endpoint, JSON.parse(execution.request_json!), api_key);

  return (await db.getApiExecution(executionId, callerRoleCode, approveUserId))!;
}

/**
 * 실행 이력을 반려(10→30)한다. 미존재 시 AppError(31009)를 던진다.
 * @author trisakion
 * @param executionId 실행 이력 ID
 * @param approveUserId 반려자 user_id
 * @param rejectReason 반려 사유
 * @param callerRoleCode 반려자 역할 코드 (대상 프로젝트 재검증용)
 * @returns 반려된 실행 이력
 */
export async function rejectApiExecution(
  executionId: number,
  approveUserId: number,
  rejectReason: string,
  callerRoleCode: number,
): Promise<APIExecutionRow> {
  const result = await db.rejectApiExecution(executionId, approveUserId, rejectReason, callerRoleCode);
  if (!result)
    throw toAppError(ERROR_MAP.API_EXECUTION_NOT_FOUND);
  return result;
}

/**
 * 실행 이력을 취소(10→60)한다. 미존재 시 AppError(31009)를 던진다.
 * @author trisakion
 * @param executionId 실행 이력 ID
 * @param callerUserId 취소 요청자 user_id
 * @param rejectReason 취소 사유
 * @returns 취소된 실행 이력
 */
export async function cancelApiExecution(
  executionId: number,
  callerUserId: number,
  rejectReason: string,
): Promise<APIExecutionRow> {
  const result = await db.cancelApiExecution(executionId, callerUserId, rejectReason);
  if (!result)
    throw toAppError(ERROR_MAP.API_EXECUTION_NOT_FOUND);
  return result;
}
