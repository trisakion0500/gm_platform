import { Request, Response, NextFunction } from 'express';
import * as companyService from '../services/company.service';
import { success, fail, formatDatetime } from '../utils/response';
import { CompanyRow } from '../types';
import { ERROR_MAP } from '../constants/errors';

/**
 * CompanyRow의 날짜 필드를 문자열로 변환한다.
 * @param c 회사 DB 행
 * @returns 날짜 필드가 포맷된 응답 객체
 */
function formatCompany(c: CompanyRow) {
  return {
    ...c,
    created_at: formatDatetime(c.created_at),
    updated_at: formatDatetime(c.updated_at),
  };
}

/**
 * POST /companies — 회사 생성 (SUPER_ADMIN)
 * @author trisakion
 * @param req body: { company_code, company_name, description? }
 * @param res 201 — 생성된 회사 정보
 * @param next 오류 전달
 * @returns void
 */
export async function createCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { company_code, company_name, description } = req.body;
    if (!company_code || !company_name) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const company = await companyService.createCompany(company_code, company_name, description ?? null);
    success(res, formatCompany(company), 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /companies — 회사 목록 조회 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req query: { page, page_size, status? }
 * @param res 200 — 페이지네이션 응답
 * @param next 오류 전달
 * @returns void
 */
export async function getCompanyList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, page, page_size } = req.query;
    if (!page || !page_size) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const pageNum = Number(page);
    const pageSizeNum = Number(page_size);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    if (![20, 50, 100].includes(pageSizeNum)) {
      fail(res, ERROR_MAP.INVALID_VALUE);
      return;
    }
    const statusNum = status !== undefined ? Number(status) : null;
    const result = await companyService.getCompanyList(
      statusNum,
      pageNum,
      pageSizeNum,
      req.user!.role_code,
      req.user!.company_id,
    );
    success(res, {
      ...result,
      items: result.items.map(formatCompany),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /companies/:company_id — 회사 단건 조회 (SUPER_ADMIN, DEVELOPER)
 * @author trisakion
 * @param req params: { company_id }
 * @param res 200 — 회사 정보
 * @param next 오류 전달
 * @returns void
 */
export async function getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = Number(req.params.company_id);
    if (!Number.isInteger(companyId) || companyId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const company = await companyService.getCompany(companyId, req.user!.role_code, req.user!.company_id);
    success(res, formatCompany(company));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /companies/:company_id — 회사 수정 (SUPER_ADMIN)
 * @author trisakion
 * @param req params: { company_id }, body: { company_code?, company_name?, description?, status? }
 * @param res 200 — 수정된 회사 정보
 * @param next 오류 전달
 * @returns void
 */
export async function updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = Number(req.params.company_id);
    if (!Number.isInteger(companyId) || companyId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { company_code, company_name, description, status } = req.body;
    const company = await companyService.updateCompany(
      companyId,
      company_code ?? null,
      company_name ?? null,
      description ?? null,
      status ?? null,
    );
    success(res, formatCompany(company));
  } catch (err) {
    next(err);
  }
}
