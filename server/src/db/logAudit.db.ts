import { callSP } from '../config/db';
import { LogAuditRow } from '../types';
import { toDBError, ERROR_MAP } from '../constants/errors';

/**
 * 감사 로그를 INSERT한다.
 * @author trisakion
 * @param companyId 회사 ID
 * @param projectId 프로젝트 ID (없으면 null)
 * @param tableName 대상 테이블명
 * @param targetId 대상 PK (복합키는 JSON 문자열)
 * @param targetName 대상 표시명
 * @param actionType 작업 유형 (10:CREATE, 20:UPDATE, 30:STATUS_CHANGE)
 * @param beforeJson 변경 전 데이터 JSON (CREATE 시 null)
 * @param afterJson 변경 후 데이터 JSON
 * @param createdBy 작업 수행 사용자 ID
 * @returns void
 */
export async function insertLogAudit(
  companyId: number,
  projectId: number | null,
  tableName: string,
  targetId: string,
  targetName: string,
  actionType: number,
  beforeJson: string | null,
  afterJson: string,
  createdBy: number,
): Promise<void> {
  await callSP('SP_INSERT_LOG_AUDIT', [
    companyId, projectId, tableName, targetId, targetName,
    actionType, beforeJson, afterJson, createdBy,
  ]);
}

/**
 * 감사 로그 목록을 페이지네이션으로 조회한다.
 * SUPER_ADMIN은 전체, DEVELOPER/APPROVER는 본인 회사만 조회 가능하다.
 * @author trisakion
 * @param companyId 회사 ID 필터 (null=전체)
 * @param projectId 프로젝트 ID 필터 (null=전체)
 * @param tableName 테이블명 필터 (null=전체)
 * @param targetId 대상 ID 필터 (null=전체)
 * @param actionType 작업 유형 필터 (null=전체)
 * @param fromCreatedAt 시작 일시 (null=제한없음)
 * @param toCreatedAt 종료 일시 (null=제한없음)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/30/50/100)
 * @param callerRoleCode 요청자 역할 코드
 * @param callerCompanyId 요청자 company_id
 * @returns { total_count, items }
 */
export async function getLogAuditList(
  companyId: number | null,
  projectId: number | null,
  tableName: string | null,
  targetId: string | null,
  actionType: number | null,
  fromCreatedAt: Date | null,
  toCreatedAt: Date | null,
  page: number,
  pageSize: number,
  callerRoleCode: number,
  callerCompanyId: number,
): Promise<{ total_count: number; items: LogAuditRow[] }> {
  const [, [countRows, itemRows]] = await callSP('SP_GET_LOG_AUDIT_LIST', [
    companyId, projectId, tableName, targetId, actionType,
    fromCreatedAt, toCreatedAt, page, pageSize, callerRoleCode, callerCompanyId,
  ]);
  return {
    total_count: (countRows[0] as unknown as { total_count: number }).total_count,
    items: itemRows as unknown as LogAuditRow[],
  };
}

/**
 * 감사 로그 단건을 조회한다.
 * 미존재 또는 접근 불가 시 DBError(31010)를 던진다.
 * @author trisakion
 * @param logAuditId 조회할 감사 로그 ID
 * @param callerRoleCode 요청자 역할 코드
 * @param callerCompanyId 요청자 company_id
 * @returns 감사 로그 상세 (before_json, after_json 포함)
 */
export async function getLogAudit(
  logAuditId: number,
  callerRoleCode: number,
  callerCompanyId: number,
): Promise<LogAuditRow> {
  const [status, [data]] = await callSP('SP_GET_LOG_AUDIT', [logAuditId, callerRoleCode, callerCompanyId]);
  if (status[0].RESULT === 31010)
    throw toDBError(ERROR_MAP.LOG_AUDIT_NOT_FOUND);
  return data[0] as unknown as LogAuditRow;
}
