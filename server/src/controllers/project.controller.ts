import { Request, Response, NextFunction } from 'express';
import * as projectService from '../services/project.service';
import { success, fail, formatDatetime } from '../utils/response';
import { ProjectRow } from '../types';
import { ERROR_MAP } from '../constants/errors';

/**
 * ProjectRow의 날짜 필드를 문자열로 변환한다.
 * @param p 프로젝트 DB 행
 * @returns 날짜 필드가 포맷된 응답 객체
 */
function formatProject(p: ProjectRow) {
  return {
    ...p,
    created_at: formatDatetime(p.created_at),
    updated_at: formatDatetime(p.updated_at),
  };
}

/**
 * POST /projects — 프로젝트 생성 (SUPER_ADMIN)
 * @author trisakion
 * @param req body: { company_id, project_code, project_name, api_base_url, description? }
 * @param res 201 — 생성된 프로젝트 정보
 * @param next 오류 전달
 * @returns void
 */
export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { company_id, project_code, project_name, api_base_url, description } = req.body;
    if (!company_id || !project_code || !project_name || !api_base_url) {
      fail(res, ERROR_MAP.REQUIRED_MISSING);
      return;
    }
    const companyId = Number(company_id);
    if (!Number.isInteger(companyId) || companyId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const project = await projectService.createProject(companyId, project_code, project_name, api_base_url, description ?? null);
    success(res, formatProject(project), 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /projects — 프로젝트 목록 조회 (전 역할)
 * @author trisakion
 * @param req query: { page, page_size, company_id?, status? }
 * @param res 200 — 페이지네이션 응답
 * @param next 오류 전달
 * @returns void
 */
export async function getProjectList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { company_id, status, page, page_size } = req.query;
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
    const companyIdNum = company_id !== undefined ? Number(company_id) : null;
    const statusNum = status !== undefined ? Number(status) : null;
    const result = await projectService.getProjectList(
      companyIdNum,
      statusNum,
      pageNum,
      pageSizeNum,
      req.user!.role_code,
      req.user!.company_id,
    );
    success(res, {
      ...result,
      items: result.items.map(formatProject),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /projects/:project_id — 프로젝트 단건 조회 (전 역할)
 * @author trisakion
 * @param req params: { project_id }
 * @param res 200 — 프로젝트 정보
 * @param next 오류 전달
 * @returns void
 */
export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.project_id);
    if (!Number.isInteger(projectId) || projectId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const project = await projectService.getProject(projectId, req.user!.role_code, req.user!.company_id);
    success(res, formatProject(project));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /projects/:project_id — 프로젝트 수정 (SUPER_ADMIN)
 * @author trisakion
 * @param req params: { project_id }, body: { project_code?, project_name?, api_base_url?, description?, status? }
 * @param res 200 — 수정된 프로젝트 정보
 * @param next 오류 전달
 * @returns void
 */
export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.project_id);
    if (!Number.isInteger(projectId) || projectId < 1) {
      fail(res, ERROR_MAP.INVALID_FORMAT);
      return;
    }
    const { project_code, project_name, api_base_url, description, status } = req.body;
    const project = await projectService.updateProject(
      projectId,
      project_code ?? null,
      project_name ?? null,
      api_base_url ?? null,
      description ?? null,
      status ?? null,
    );
    success(res, formatProject(project));
  } catch (err) {
    next(err);
  }
}
