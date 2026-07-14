import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ApiExecution, PaginatedResponse } from "../types";

const PAGE_SIZES = [20, 30, 50, 100] as const;

const inputSchema = {
  project_id: z.number().int().positive().describe("조회할 프로젝트 ID"),
  page: z.number().int().positive().default(1).describe("페이지 번호 (1부터)"),
  page_size: z.union(PAGE_SIZES.map((n) => z.literal(n))).default(20).describe("페이지 크기 (20/30/50/100 중 하나)"),
};

/**
 * list_pending_executions tool을 등록한다. GET /api-executions/pending —
 * status=10(PENDING)인 승인 대기 건만 조회한다. SUPER_ADMIN/DEVELOPER/APPROVER 계정에서만 노출된다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerListPendingExecutionsTool(server: McpServer): void {
  server.registerTool(
    "list_pending_executions",
    {
      title: "승인 대기 목록 조회",
      description: "승인이 필요한 상태로 대기 중인(PENDING) API 실행 건 목록을 조회한다.",
      inputSchema,
    },
    safeTool<{ project_id: number; page: number; page_size: number }>(({ project_id, page, page_size }) =>
      request<PaginatedResponse<ApiExecution>>({
        method: "GET",
        url: "/api-executions/pending",
        params: { project_id, page, page_size },
      }),
    ),
  );
}
