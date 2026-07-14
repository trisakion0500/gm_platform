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
  api_id: z.number().int().positive().optional().describe("특정 API로 필터링 (선택)"),
  status: z.number().int().optional().describe("상태 필터: 10=PENDING, 20=APPROVED, 30=REJECTED, 40=SUCCESS, 50=FAILED, 60=CANCELED (선택)"),
  required_approval_only: z.boolean().optional().describe("true면 승인이 필요했던 실행 건만 필터링 (선택)"),
};

/**
 * list_executions tool을 등록한다. GET /api-executions — 본인이 요청한 API 실행 이력을 조회한다.
 * OPERATOR 계정으로 로그인한 경우 서버가 본인 요청 건으로 자동 스코핑한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerListExecutionsTool(server: McpServer): void {
  server.registerTool(
    "list_executions",
    {
      title: "실행 이력 목록 조회",
      description: "API 실행 이력을 페이지네이션으로 조회한다. OPERATOR 계정은 서버가 본인 요청 건만 자동으로 보여준다.",
      inputSchema,
    },
    safeTool<{
      project_id: number;
      page: number;
      page_size: number;
      api_id?: number;
      status?: number;
      required_approval_only?: boolean;
    }>(({ project_id, page, page_size, api_id, status, required_approval_only }) =>
      request<PaginatedResponse<ApiExecution>>({
        method: "GET",
        url: "/api-executions",
        params: {
          project_id,
          page,
          page_size,
          api_id,
          status,
          required_approval_only: required_approval_only ? 1 : undefined,
        },
      }),
    ),
  );
}
