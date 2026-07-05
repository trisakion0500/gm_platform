import { Request, Response, NextFunction } from 'express';
import * as companyService from '../services/company.service';
import { success, fail, formatDatetime } from '../utils/response';
import { CompanyRow } from '../types';
import { ERROR_MAP } from '../constants/errors';
import { parsePositiveInt, parsePagination } from '../utils/validation';

const COMPANY_CODE_PATTERN = /^[a-zA-Z0-9_.-]{1,20}$/;
const COMPANY_NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;

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
 * GET /companies/lookup — 회사코드로 활성 회사 조회 (인증 불필요, 회원가입 화면 전용)
 * @author trisakion
 * @param req query: { company_code }
 * @param res 200 — { company_id, company_name }
 * @param next 오류 전달
 * @returns void
 */
export async function getCompanyByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { company_code } = req.query;
    if (!company_code) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    if (typeof company_code !== 'string' || !COMPANY_CODE_PATTERN.test(company_code)) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const result = await companyService.getCompanyByCode(company_code);
    success(res, result);
  } catch (err) {
    next(err);
  }
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
    if (!COMPANY_CODE_PATTERN.test(company_code)) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    if (company_name.length > COMPANY_NAME_MAX_LENGTH || (description && description.length > DESCRIPTION_MAX_LENGTH)) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const company = await companyService.createCompany(company_code, company_name, description ?? null, req.user!.user_id);
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
    const paged = parsePagination(page, page_size);
    if (!paged.ok) {
      fail(res, paged.error);
      return;
    }
    const statusNum = status !== undefined ? Number(status) : null;
    const result = await companyService.getCompanyList(
      statusNum,
      paged.page,
      paged.pageSize,
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
    const companyId = parsePositiveInt(req.params.company_id);
    if (companyId === null) {
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
    const companyId = parsePositiveInt(req.params.company_id);
    if (companyId === null) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { company_code, company_name, description, status } = req.body;
    if (company_code && !COMPANY_CODE_PATTERN.test(company_code)) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    if ((company_name && company_name.length > COMPANY_NAME_MAX_LENGTH) || (description && description.length > DESCRIPTION_MAX_LENGTH)) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const company = await companyService.updateCompany(
      companyId,
      company_code ?? null,
      company_name ?? null,
      description ?? null,
      status ?? null,
      req.user!.role_code,
      req.user!.company_id,
      req.user!.user_id,
    );
    success(res, formatCompany(company));
  } catch (err) {
    next(err);
  }
}
