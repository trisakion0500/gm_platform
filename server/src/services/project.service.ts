import { ProjectRow, ProjectLookupRow } from '../types';
import { toAppError, ERROR_MAP } from '../constants/errors';
import * as db from '../db/project.db';
import * as audit from './logAudit.service';

/**
 * 프로젝트코드로 활성 프로젝트를 조회한다 (회원가입 화면 전용, 인증 불필요).
 * @author trisakion
 * @param companyId 소속 회사 ID (먼저 확인된 company_id)
 * @param projectCode 조회할 프로젝트 코드
 * @returns { project_id, project_name }
 */
export async function getProjectByCode(companyId: number, projectCode: string): Promise<ProjectLookupRow> {
  return db.getProjectByCode(companyId, projectCode);
}

/**
 * 프로젝트를 생성한다.
 * @author trisakion
 * @param companyId 소속 회사 ID
 * @param projectCode 프로젝트 코드
 * @param projectName 프로젝트명
 * @param apiBaseUrl API Base URL
 * @param description 설명 (없으면 null)
 * @param callerUserId 작업 수행 사용자 ID
 * @returns 생성된 프로젝트 정보
 */
export async function createProject(
  companyId: number,
  projectCode: string,
  projectName: string,
  apiBaseUrl: string,
  description: string | null,
  callerUserId: number,
): Promise<ProjectRow> {
  const after = await db.createProject(companyId, projectCode, projectName, apiBaseUrl, description);
  audit.logCreate('project', String(after.project_id), after.project_name,
    after.company_id, after.project_id, after as unknown as Record<string, unknown>, callerUserId);
  return after;
}

/**
 * 프로젝트 목록을 페이지네이션으로 조회한다.
 * @author trisakion
 * @param companyId 회사 ID 필터 (null=전체)
 * @param status 상태 필터 (null=전체)
 * @param page 페이지 번호 (1부터)
 * @param pageSize 페이지 크기 (20/50/100)
 * @param roleCode 요청자 역할 코드
 * @param userId 요청자 user_id (스코핑용)
 * @returns 페이지네이션 응답 { page, page_size, total_count, items }
 */
export async function getProjectList(
  companyId: number | null,
  status: number | null,
  page: number,
  pageSize: number,
  roleCode: number,
  userId: number,
): Promise<{ page: number; page_size: number; total_count: number; items: ProjectRow[] }> {
  const result = await db.getProjectList(companyId, status, page, pageSize, roleCode, userId);
  return { page, page_size: pageSize, ...result };
}

/**
 * 프로젝트 단건을 조회한다. 존재하지 않거나 접근 불가 시 AppError(31002)를 던진다.
 * @author trisakion
 * @param projectId 조회할 프로젝트 ID
 * @param roleCode 요청자 역할 코드
 * @param userId 요청자 user_id (스코핑용)
 * @returns 프로젝트 정보
 */
export async function getProject(
  projectId: number,
  roleCode: number,
  userId: number,
): Promise<ProjectRow> {
  const project = await db.getProject(projectId, roleCode, userId);
  if (!project)
    throw toAppError(ERROR_MAP.PROJECT_NOT_FOUND);
  return project;
}

/**
 * 프로젝트 정보를 수정한다.
 * @author trisakion
 * @param projectId 수정할 프로젝트 ID
 * @param projectCode 프로젝트 코드 (null=변경 없음)
 * @param projectName 프로젝트명 (null=변경 없음)
 * @param apiBaseUrl API Base URL (null=변경 없음)
 * @param description 설명 (null=변경 없음)
 * @param status 상태 (null=변경 없음)
 * @param callerUserId 작업 수행 사용자 ID
 * @returns 수정된 프로젝트 정보
 */
export async function updateProject(
  projectId: number,
  projectCode: string | null,
  projectName: string | null,
  apiBaseUrl: string | null,
  description: string | null,
  status: number | null,
  callerUserId: number,
): Promise<ProjectRow> {
  const before = await db.getProject(projectId, 10, 0);
  const after  = await db.updateProject(projectId, projectCode, projectName, apiBaseUrl, description, status);
  audit.logUpdate('project', String(after.project_id), after.project_name,
    after.company_id, after.project_id,
    before! as unknown as Record<string, unknown>,
    after   as unknown as Record<string, unknown>,
    callerUserId);
  return after;
}
