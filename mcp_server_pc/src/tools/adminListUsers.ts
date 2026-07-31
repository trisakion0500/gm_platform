import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { PaginatedResponse, UserAdminRow } from "../types";

const PAGE_SIZES = [20, 30, 50, 100] as const;

const inputSchema = {
  page: z.number().int().positive().default(1).describe("페이지 번호 (1부터)"),
  page_size: z.union(PAGE_SIZES.map((n) => z.literal(n))).default(20).describe("페이지 크기 (20/30/50/100 중 하나)"),
  status: z.number().int().optional().describe("상태 필터: 0=승인대기, 1=정상, 2=반려, 3=사용중지 (선택)"),
  company_id: z.number().int().positive().optional().describe("특정 회사로 필터링 (선택, SUPER_ADMIN만 의미 있음)"),
};

/**
 * admin_list_users tool을 등록한다. GET /users — 사용자 목록을 페이지네이션으로 조회한다.
 * DEVELOPER 계정은 본인 소속 회사의 사용자 전체(모든 status)로 자동 스코핑된다. SUPER_ADMIN/DEVELOPER 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminListUsersTool(server: McpServer): void {
  server.registerTool(
    "admin_list_users",
    {
      title: "사용자 목록 조회",
      description: "사용자 목록을 페이지네이션으로 조회한다. DEVELOPER는 본인 소속 회사 사용자만 보인다.",
      inputSchema,
    },
    safeTool<{ page: number; page_size: number; status?: number; company_id?: number }>(
      ({ page, page_size, status, company_id }) =>
        request<PaginatedResponse<UserAdminRow>>({
          method: "GET",
          url: "/users",
          params: { page, page_size, status, company_id },
        }),
    ),
  );
}
