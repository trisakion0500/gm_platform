import { callSP } from '../config/db';
import { LogAuditRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import { formatDatetime } from '../utils/response';
import logger from '../utils/logger';
import * as db from '../db/logAudit.db';

const SKIP_FIELDS = new Set(['updated_at', 'updated_by', 'last_login_at']);

/**
 * DB 행을 audit 용 JSON 문자열로 직렬화한다. Date는 포맷 문자열로 변환한다.
 * @param row DB 행 객체
 * @returns JSON 문자열
 */
function toAuditJson(row: Record<string, unknown>): string {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    result[k] = v instanceof Date ? formatDatetime(v) : v;
  }
  return JSON.stringify(result);
}

/**
 * status 외 필드에 변경이 있는지 확인한다.
 * @param before 이전 상태
 * @param after 이후 상태
 * @returns 일반 필드 변경 여부
 */
function hasGeneralChange(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): boolean {
  return Object.keys(after).some(k => {
    if (k === 'status' || SKIP_FIELDS.has(k))
      return false;
    const bv = before[k] instanceof Date ? formatDatetime(before[k] as Date) : before[k];
    const av = after[k] instanceof Date ? formatDatetime(after[k] as Date) : after[k];
    return bv !== av;
  });
}

/**
 * project_id로 company_id를 조회한다. audit 내부에서만 사용한다.
 * project 엔티티는 서비스 시그니처에 company_id가 없으므로 audit 기록 시 직접 조회가 필요하다.
 * @param projectId 조회할 프로젝트 ID
 * @returns company_id, 실패 시 null
 */
async function resolveCompanyId(projectId: number): Promise<number | null> {
  const [status, [data]] = await callSP('SP_GET_PROJECT', [projectId, 10, 0]);
  if (status[0].RESULT !== 0)
    return null;
  return (data[0] as any)?.company_id ?? null;
}

/**
 * api_id로 project_id와 company_id를 조회한다. audit 내부에서만 사용한다.
 * api/api_request/api_response 엔티티는 서비스 시그니처에 company_id가 없으므로
 * api → project → company 순으로 2단계 체인 조회가 필요하다.
 * @param apiId 조회할 API ID
 * @returns { projectId, companyId }, 실패 시 null
 */
export async function resolveApiScope(apiId: number): Promise<{ projectId: number; companyId: number } | null> {
  const [status, [apiRows]] = await callSP('SP_GET_API', [apiId]);
  if (status[0].RESULT !== 0)
    return null;
  const projectId = (apiRows[0] as any)?.project_id;
  if (!projectId)
    return null;
  const companyId = await resolveCompanyId(projectId);
  if (!companyId)
    return null;
  return { projectId, companyId };
}

/**
 * code_group_id로 project_id와 company_id를 조회한다. audit 내부에서만 사용한다.
 * code_group/code_item 엔티티는 서비스 시그니처에 company_id가 없으므로
 * code_group → project → company 순으로 2단계 체인 조회가 필요하다.
 * @param codeGroupId 조회할 코드 그룹 ID
 * @returns { projectId, companyId }, 실패 시 null
 */
export async function resolveCodeGroupScope(codeGroupId: number): Promise<{ projectId: number; companyId: number } | null> {
  const [status, [data]] = await callSP('SP_GET_CODE_GROUP', [codeGroupId]);
  if (status[0].RESULT !== 0)
    return null;
  const projectId = (data[0] as any)?.project_id;
  if (!projectId)
    return null;
  const companyId = await resolveCompanyId(projectId);
  if (!companyId)
    return null;
  return { projectId, companyId };
}

/**
 * CREATE 작업 감사 로그를 기록한다 (fire-and-forget).
 * 실패해도 예외를 전파하지 않는다.
 * @author trisakion
 * @param tableName 대상 테이블명
 * @param targetId 대상 PK 문자열
 * @param targetName 대상 표시명
 * @param companyId 감사 로그 company_id
 * @param projectId 감사 로그 project_id (null 허용)
 * @param after 생성된 행
 * @param callerUserId 작업 수행 사용자 ID
 */
export function logCreate(
  tableName: string,
  targetId: string,
  targetName: string,
  companyId: number,
  projectId: number | null,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  db.insertLogAudit(
    companyId, projectId, tableName, targetId, targetName,
    10, null, toAuditJson(after), callerUserId,
  ).catch(err => logger.warn({ err }, `audit log failed [CREATE ${tableName}]`));
}

/**
 * UPDATE / STATUS_CHANGE 작업 감사 로그를 기록한다 (fire-and-forget).
 * status와 일반 필드가 동시에 변경된 경우 UPDATE → STATUS_CHANGE 순으로 2건 기록한다.
 * 실패해도 예외를 전파하지 않는다.
 * @author trisakion
 * @param tableName 대상 테이블명
 * @param targetId 대상 PK 문자열
 * @param targetName 대상 표시명
 * @param companyId 감사 로그 company_id
 * @param projectId 감사 로그 project_id (null 허용)
 * @param before 변경 전 행
 * @param after 변경 후 행
 * @param callerUserId 작업 수행 사용자 ID
 */
export function logUpdate(
  tableName: string,
  targetId: string,
  targetName: string,
  companyId: number,
  projectId: number | null,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const beforeJson = toAuditJson(before);
    const afterJson  = toAuditJson(after);
    const statusChanged  = (before as any).status !== (after as any).status;
    const generalChanged = hasGeneralChange(before, after);

    if (statusChanged && generalChanged) {
      const intermediate     = { ...after, status: (before as any).status };
      const intermediateJson = toAuditJson(intermediate as Record<string, unknown>);
      await db.insertLogAudit(companyId, projectId, tableName, targetId, targetName, 20, beforeJson,      intermediateJson, callerUserId);
      await db.insertLogAudit(companyId, projectId, tableName, targetId, targetName, 30, intermediateJson, afterJson,       callerUserId);
    } else if (statusChanged) {
      await db.insertLogAudit(companyId, projectId, tableName, targetId, targetName, 30, beforeJson, afterJson, callerUserId);
    } else {
      await db.insertLogAudit(companyId, projectId, tableName, targetId, targetName, 20, beforeJson, afterJson, callerUserId);
    }
  })().catch(err => logger.warn({ err }, `audit log failed [UPDATE ${tableName}]`));
}

/**
 * user_role CREATE 감사 로그를 기록한다. project → company_id 를 내부에서 조회한다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param projectId 프로젝트 ID
 * @param loginId 대상 표시명에 사용할 사용자 로그인 ID
 * @param after 생성된 행
 * @param callerUserId 작업 수행 사용자 ID
 */
export function logCreateUserRole(
  userId: number,
  projectId: number,
  loginId: string,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const companyId = await resolveCompanyId(projectId);
    if (!companyId)
      return;
    await db.insertLogAudit(
      companyId, projectId, 'user_role',
      JSON.stringify({ user_id: userId, project_id: projectId }),
      loginId, 10, null, toAuditJson(after), callerUserId,
    );
  })().catch(err => logger.warn({ err }, 'audit log failed [CREATE user_role]'));
}

/**
 * user_role UPDATE 감사 로그를 기록한다. project → company_id 를 내부에서 조회한다.
 * @author trisakion
 * @param userId 사용자 ID
 * @param projectId 프로젝트 ID
 * @param loginId 대상 표시명에 사용할 사용자 로그인 ID
 * @param before 변경 전 행
 * @param after 변경 후 행
 * @param callerUserId 작업 수행 사용자 ID
 */
export function logUpdateUserRole(
  userId: number,
  projectId: number,
  loginId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const companyId = await resolveCompanyId(projectId);
    if (!companyId)
      return;
    const targetId   = JSON.stringify({ user_id: userId, project_id: projectId });
    const beforeJson = toAuditJson(before);
    const afterJson  = toAuditJson(after);
    const statusChanged  = (before as any).status !== (after as any).status;
    const generalChanged = hasGeneralChange(before, after);

    if (statusChanged && generalChanged) {
      const intermediate     = { ...after, status: (before as any).status };
      const intermediateJson = toAuditJson(intermediate as Record<string, unknown>);
      await db.insertLogAudit(companyId, projectId, 'user_role', targetId, loginId, 20, beforeJson,      intermediateJson, callerUserId);
      await db.insertLogAudit(companyId, projectId, 'user_role', targetId, loginId, 30, intermediateJson, afterJson,       callerUserId);
    } else if (statusChanged) {
      await db.insertLogAudit(companyId, projectId, 'user_role', targetId, loginId, 30, beforeJson, afterJson, callerUserId);
    } else {
      await db.insertLogAudit(companyId, projectId, 'user_role', targetId, loginId, 20, beforeJson, afterJson, callerUserId);
    }
  })().catch(err => logger.warn({ err }, 'audit log failed [UPDATE user_role]'));
}

/**
 * api CREATE 감사 로그를 기록한다. project → company_id 를 내부에서 조회한다.
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param after 생성된 API 행
 * @param callerUserId 작업 수행 사용자 ID
 */
export function logCreateApi(
  projectId: number,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const companyId = await resolveCompanyId(projectId);
    if (!companyId)
      return;
    await db.insertLogAudit(
      companyId, projectId, 'api',
      String((after as any).api_id), (after as any).api_name as string,
      10, null, toAuditJson(after), callerUserId,
    );
  })().catch(err => logger.warn({ err }, 'audit log failed [CREATE api]'));
}

/**
 * api UPDATE 감사 로그를 기록한다. project → company_id 를 내부에서 조회한다.
 * @author trisakion
 * @param projectId 프로젝트 ID
 * @param before 변경 전 API 행
 * @param after 변경 후 API 행
 * @param callerUserId 작업 수행 사용자 ID
 */
export function logUpdateApi(
  projectId: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const companyId = await resolveCompanyId(projectId);
    if (!companyId)
      return;
    const targetId   = String((after as any).api_id);
    const targetName = (after as any).api_name as string;
    const beforeJson = toAuditJson(before);
    const afterJson  = toAuditJson(after);
    const statusChanged  = (before as any).status !== (after as any).status;
    const generalChanged = hasGeneralChange(before, after);

    if (statusChanged && generalChanged) {
      const intermediate     = { ...after, status: (before as any).status };
      const intermediateJson = toAuditJson(intermediate as Record<string, unknown>);
      await db.insertLogAudit(companyId, projectId, 'api', targetId, targetName, 20, beforeJson,      intermediateJson, callerUserId);
      await db.insertLogAudit(companyId, projectId, 'api', targetId, targetName, 30, intermediateJson, afterJson,       callerUserId);
    } else if (statusChanged) {
      await db.insertLogAudit(companyId, projectId, 'api', targetId, targetName, 30, beforeJson, afterJson, callerUserId);
    } else {
      await db.insertLogAudit(companyId, projectId, 'api', targetId, targetName, 20, beforeJson, afterJson, callerUserId);
    }
  })().catch(err => logger.warn({ err }, 'audit log failed [UPDATE api]'));
}

/**
 * api_request CREATE 감사 로그를 기록한다. api → project → company_id 를 내부에서 조회한다.
 * @author trisakion
 * @param apiId 소속 API ID
 * @param after 생성된 API Request 행
 * @param callerUserId 작업 수행 사용자 ID
 */
export function logCreateApiRequest(
  apiId: number,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const scope = await resolveApiScope(apiId);
    if (!scope)
      return;
    await db.insertLogAudit(
      scope.companyId, scope.projectId, 'api_request',
      String((after as any).api_request_id), (after as any).parameter_name as string,
      10, null, toAuditJson(after), callerUserId,
    );
  })().catch(err => logger.warn({ err }, 'audit log failed [CREATE api_request]'));
}

/**
 * api_request UPDATE 감사 로그를 기록한다. api → project → company_id 를 내부에서 조회한다.
 * @author trisakion
 * @param apiId 소속 API ID
 * @param before 변경 전 행
 * @param after 변경 후 행
 * @param callerUserId 작업 수행 사용자 ID
 */
export function logUpdateApiRequest(
  apiId: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const scope = await resolveApiScope(apiId);
    if (!scope)
      return;
    const targetId   = String((after as any).api_request_id);
    const targetName = (after as any).parameter_name as string;
    const beforeJson = toAuditJson(before);
    const afterJson  = toAuditJson(after);
    const statusChanged  = (before as any).status !== (after as any).status;
    const generalChanged = hasGeneralChange(before, after);

    if (statusChanged && generalChanged) {
      const intermediate     = { ...after, status: (before as any).status };
      const intermediateJson = toAuditJson(intermediate as Record<string, unknown>);
      await db.insertLogAudit(scope.companyId, scope.projectId, 'api_request', targetId, targetName, 20, beforeJson,      intermediateJson, callerUserId);
      await db.insertLogAudit(scope.companyId, scope.projectId, 'api_request', targetId, targetName, 30, intermediateJson, afterJson,       callerUserId);
    } else if (statusChanged) {
      await db.insertLogAudit(scope.companyId, scope.projectId, 'api_request', targetId, targetName, 30, beforeJson, afterJson, callerUserId);
    } else {
      await db.insertLogAudit(scope.companyId, scope.projectId, 'api_request', targetId, targetName, 20, beforeJson, afterJson, callerUserId);
    }
  })().catch(err => logger.warn({ err }, 'audit log failed [UPDATE api_request]'));
}

/**
 * api_response CREATE 감사 로그를 기록한다.
 * @author trisakion
 */
export function logCreateApiResponse(
  apiId: number,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const scope = await resolveApiScope(apiId);
    if (!scope)
      return;
    await db.insertLogAudit(
      scope.companyId, scope.projectId, 'api_response',
      String((after as any).api_response_id), (after as any).parameter_name as string,
      10, null, toAuditJson(after), callerUserId,
    );
  })().catch(err => logger.warn({ err }, 'audit log failed [CREATE api_response]'));
}

/**
 * api_response UPDATE 감사 로그를 기록한다.
 * @author trisakion
 */
export function logUpdateApiResponse(
  apiId: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const scope = await resolveApiScope(apiId);
    if (!scope)
      return;
    const targetId   = String((after as any).api_response_id);
    const targetName = (after as any).parameter_name as string;
    const beforeJson = toAuditJson(before);
    const afterJson  = toAuditJson(after);
    const statusChanged  = (before as any).status !== (after as any).status;
    const generalChanged = hasGeneralChange(before, after);

    if (statusChanged && generalChanged) {
      const intermediate     = { ...after, status: (before as any).status };
      const intermediateJson = toAuditJson(intermediate as Record<string, unknown>);
      await db.insertLogAudit(scope.companyId, scope.projectId, 'api_response', targetId, targetName, 20, beforeJson,      intermediateJson, callerUserId);
      await db.insertLogAudit(scope.companyId, scope.projectId, 'api_response', targetId, targetName, 30, intermediateJson, afterJson,       callerUserId);
    } else if (statusChanged) {
      await db.insertLogAudit(scope.companyId, scope.projectId, 'api_response', targetId, targetName, 30, beforeJson, afterJson, callerUserId);
    } else {
      await db.insertLogAudit(scope.companyId, scope.projectId, 'api_response', targetId, targetName, 20, beforeJson, afterJson, callerUserId);
    }
  })().catch(err => logger.warn({ err }, 'audit log failed [UPDATE api_response]'));
}

/**
 * code_group CREATE 감사 로그를 기록한다.
 * @author trisakion
 */
export function logCreateCodeGroup(
  projectId: number,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const companyId = await resolveCompanyId(projectId);
    if (!companyId)
      return;
    await db.insertLogAudit(
      companyId, projectId, 'code_group',
      String((after as any).code_group_id), (after as any).code_group_name as string,
      10, null, toAuditJson(after), callerUserId,
    );
  })().catch(err => logger.warn({ err }, 'audit log failed [CREATE code_group]'));
}

/**
 * code_group UPDATE 감사 로그를 기록한다.
 * @author trisakion
 */
export function logUpdateCodeGroup(
  projectId: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const companyId = await resolveCompanyId(projectId);
    if (!companyId)
      return;
    const targetId   = String((after as any).code_group_id);
    const targetName = (after as any).code_group_name as string;
    const beforeJson = toAuditJson(before);
    const afterJson  = toAuditJson(after);
    const statusChanged  = (before as any).status !== (after as any).status;
    const generalChanged = hasGeneralChange(before, after);

    if (statusChanged && generalChanged) {
      const intermediate     = { ...after, status: (before as any).status };
      const intermediateJson = toAuditJson(intermediate as Record<string, unknown>);
      await db.insertLogAudit(companyId, projectId, 'code_group', targetId, targetName, 20, beforeJson,      intermediateJson, callerUserId);
      await db.insertLogAudit(companyId, projectId, 'code_group', targetId, targetName, 30, intermediateJson, afterJson,       callerUserId);
    } else if (statusChanged) {
      await db.insertLogAudit(companyId, projectId, 'code_group', targetId, targetName, 30, beforeJson, afterJson, callerUserId);
    } else {
      await db.insertLogAudit(companyId, projectId, 'code_group', targetId, targetName, 20, beforeJson, afterJson, callerUserId);
    }
  })().catch(err => logger.warn({ err }, 'audit log failed [UPDATE code_group]'));
}

/**
 * code_item CREATE 감사 로그를 기록한다.
 * @author trisakion
 */
export function logCreateCodeItem(
  codeGroupId: number,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const scope = await resolveCodeGroupScope(codeGroupId);
    if (!scope)
      return;
    await db.insertLogAudit(
      scope.companyId, scope.projectId, 'code_item',
      String((after as any).code_item_id), (after as any).code_name as string,
      10, null, toAuditJson(after), callerUserId,
    );
  })().catch(err => logger.warn({ err }, 'audit log failed [CREATE code_item]'));
}

/**
 * code_item UPDATE 감사 로그를 기록한다.
 * @author trisakion
 */
export function logUpdateCodeItem(
  codeGroupId: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  callerUserId: number,
): void {
  (async () => {
    const scope = await resolveCodeGroupScope(codeGroupId);
    if (!scope)
      return;
    const targetId   = String((after as any).code_item_id);
    const targetName = (after as any).code_name as string;
    const beforeJson = toAuditJson(before);
    const afterJson  = toAuditJson(after);
    const statusChanged  = (before as any).status !== (after as any).status;
    const generalChanged = hasGeneralChange(before, after);

    if (statusChanged && generalChanged) {
      const intermediate     = { ...after, status: (before as any).status };
      const intermediateJson = toAuditJson(intermediate as Record<string, unknown>);
      await db.insertLogAudit(scope.companyId, scope.projectId, 'code_item', targetId, targetName, 20, beforeJson,      intermediateJson, callerUserId);
      await db.insertLogAudit(scope.companyId, scope.projectId, 'code_item', targetId, targetName, 30, intermediateJson, afterJson,       callerUserId);
    } else if (statusChanged) {
      await db.insertLogAudit(scope.companyId, scope.projectId, 'code_item', targetId, targetName, 30, beforeJson, afterJson, callerUserId);
    } else {
      await db.insertLogAudit(scope.companyId, scope.projectId, 'code_item', targetId, targetName, 20, beforeJson, afterJson, callerUserId);
    }
  })().catch(err => logger.warn({ err }, 'audit log failed [UPDATE code_item]'));
}

/**
 * 감사 로그 목록을 조회한다.
 * @author trisakion
 * @param companyId 회사 ID 필터 (null=전체)
 * @param projectId 프로젝트 ID 필터 (null=전체)
 * @param tableName 테이블명 필터 (null=전체)
 * @param targetId 대상 ID 필터 (null=전체)
 * @param actionType 작업 유형 필터 (null=전체)
 * @param createdBy 작업자 ID 필터 (null=전체)
 * @param fromCreatedAt 시작 일시 (null=제한없음)
 * @param toCreatedAt 종료 일시 (null=제한없음)
 * @param page 페이지 번호
 * @param pageSize 페이지 크기
 * @param callerRoleCode 요청자 역할 코드
 * @param callerCompanyId 요청자 company_id
 * @returns 페이지네이션 응답
 */
export async function getLogAuditList(
  companyId: number | null,
  projectId: number | null,
  tableName: string | null,
  targetId: string | null,
  actionType: number | null,
  createdBy: number | null,
  fromCreatedAt: Date | null,
  toCreatedAt: Date | null,
  page: number,
  pageSize: number,
  callerRoleCode: number,
  callerCompanyId: number,
): Promise<{ page: number; page_size: number; total_count: number; items: LogAuditRow[] }> {
  const result = await db.getLogAuditList(
    companyId, projectId, tableName, targetId, actionType, createdBy,
    fromCreatedAt, toCreatedAt, page, pageSize, callerRoleCode, callerCompanyId,
  );
  return { page, page_size: pageSize, ...result };
}

/**
 * 감사 로그 단건을 조회한다. 미존재 또는 접근 불가 시 AppError(31010)를 던진다.
 * @author trisakion
 * @param logAuditId 조회할 감사 로그 ID
 * @param callerRoleCode 요청자 역할 코드
 * @param callerCompanyId 요청자 company_id
 * @returns 감사 로그 상세
 */
export async function getLogAudit(
  logAuditId: number,
  callerRoleCode: number,
  callerCompanyId: number,
): Promise<LogAuditRow> {
  try {
    return await db.getLogAudit(logAuditId, callerRoleCode, callerCompanyId);
  } catch {
    throw toAppError(ERROR_MAP.LOG_AUDIT_NOT_FOUND);
  }
}
