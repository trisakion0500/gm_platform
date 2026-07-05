import { Request, Response, NextFunction } from 'express';
import * as logAuditService from '../services/logAudit.service';
import { success, fail, formatDatetime } from '../utils/response';
import { LogAuditRow } from '../types';
import { ERROR_MAP } from '../constants/errors';
import { parsePositiveInt, parsePagination } from '../utils/validation';

/**
 * LogAuditRow의 날짜 필드를 문자열로 변환한다.
 * @param r 감사 로그 DB 행
 * @returns 날짜 필드가 포맷된 응답 객체
 */
function formatLogAudit(r: LogAuditRow) {
  return {
    ...r,
    created_at: formatDatetime(r.created_at),
  };
}

/**
 * GET /log-audits — 감사 로그 목록 조회 (SUPER_ADMIN, DEVELOPER, APPROVER)
 * @author trisakion
 * @param req query: { page, page_size, company_id?, project_id?, table_name?, target_id?, action_type?, from_created_at?, to_created_at? }
 * @param res 200 — 페이지네이션 응답
 * @param next 오류 전달
 * @returns void
 */
export async function getLogAuditList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, page_size, company_id, project_id, table_name, target_id,
            action_type, from_created_at, to_created_at } = req.query;
    const paged = parsePagination(page, page_size);
    if (!paged.ok) {
      fail(res, paged.error);
      return;
    }
    const result = await logAuditService.getLogAuditList(
      company_id    !== undefined ? Number(company_id)    : null,
      project_id    !== undefined ? Number(project_id)    : null,
      table_name    !== undefined ? String(table_name)    : null,
      target_id     !== undefined ? String(target_id)     : null,
      action_type   !== undefined ? Number(action_type)   : null,
      from_created_at !== undefined ? new Date(String(from_created_at)) : null,
      to_created_at   !== undefined ? new Date(String(to_created_at))   : null,
      paged.page,
      paged.pageSize,
      req.user!.role_code,
      req.user!.company_id,
    );
    success(res, {
      ...result,
      items: result.items.map(formatLogAudit),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /log-audits/:log_audit_id — 감사 로그 단건 조회 (SUPER_ADMIN, DEVELOPER, APPROVER)
 * @author trisakion
 * @param req params: { log_audit_id }
 * @param res 200 — 감사 로그 상세 (before_json, after_json 포함)
 * @param next 오류 전달
 * @returns void
 */
export async function getLogAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const logAuditId = parsePositiveInt(req.params.log_audit_id);
    if (logAuditId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const log = await logAuditService.getLogAudit(logAuditId, req.user!.role_code, req.user!.company_id);
    success(res, formatLogAudit(log));
  } catch (err) {
    next(err);
  }
}
