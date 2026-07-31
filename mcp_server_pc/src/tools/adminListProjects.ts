import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { PaginatedResponse, ProjectAdminRow } from "../types";

const PAGE_SIZES = [20, 30, 50, 100] as const;

const inputSchema = {
  page: z.number().int().positive().default(1).describe("페이지 번호 (1부터)"),
  page_size: z.union(PAGE_SIZES.map((n) => z.literal(n))).default(20).describe("페이지 크기 (20/30/50/100 중 하나)"),
  company_id: z.number().int().positive().optional().describe("특정 회사로 필터링 (선택)"),
  status: z.number().int().optional().describe("상태 필터: 1=사용, 0=중지 (선택)"),
};

/**
 * admin_list_projects tool을 등록한다. GET /projects — 프로젝트 목록을 페이지네이션으로 조회한다.
 * DEVELOPER 계정은 실제 user_role(role_code=20)을 가진 프로젝트만 보인다. SUPER_ADMIN/DEVELOPER 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminListProjectsTool(server: McpServer): void {
  server.registerTool(
    "admin_list_projects",
    {
      title: "프로젝트 목록 조회 (관리용)",
      description: "프로젝트 목록을 페이지네이션으로 조회한다. DEVELOPER는 실제 배정된 프로젝트만 보인다.",
      inputSchema,
    },
    safeTool<{ page: number; page_size: number; company_id?: number; status?: number }>(
      ({ page, page_size, company_id, status }) =>
        request<PaginatedResponse<ProjectAdminRow>>({
          method: "GET",
          url: "/projects",
          params: { page, page_size, company_id, status },
        }),
    ),
  );
}
