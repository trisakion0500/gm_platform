import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { CompanyRow, PaginatedResponse } from "../types";

const PAGE_SIZES = [20, 30, 50, 100] as const;

const inputSchema = {
  page: z.number().int().positive().default(1).describe("페이지 번호 (1부터)"),
  page_size: z.union(PAGE_SIZES.map((n) => z.literal(n))).default(20).describe("페이지 크기 (20/30/50/100 중 하나)"),
  status: z.number().int().optional().describe("상태 필터: 1=사용, 0=중지 (선택)"),
};

/**
 * admin_list_companies tool을 등록한다. GET /companies — 회사 목록을 페이지네이션으로 조회한다.
 * SUPER_ADMIN 외 역할은 서버가 본인 소속 회사로 자동 스코핑한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminListCompaniesTool(server: McpServer): void {
  server.registerTool(
    "admin_list_companies",
    {
      title: "회사 목록 조회",
      description: "회사 목록을 페이지네이션으로 조회한다. SUPER_ADMIN 외 역할은 본인 소속 회사만 보인다.",
      inputSchema,
    },
    safeTool<{ page: number; page_size: number; status?: number }>(({ page, page_size, status }) =>
      request<PaginatedResponse<CompanyRow>>({
        method: "GET",
        url: "/companies",
        params: { page, page_size, status },
      }),
    ),
  );
}
