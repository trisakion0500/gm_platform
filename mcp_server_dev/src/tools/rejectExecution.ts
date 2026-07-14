import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ApiExecution } from "../types";

const inputSchema = {
  api_execution_id: z.number().int().positive().describe("반려할 실행 이력 ID (PENDING 상태만 가능)"),
  reject_reason: z.string().min(1).describe("반려 사유"),
};

/**
 * reject_execution tool을 등록한다. POST /api-executions/:id/reject —
 * SUPER_ADMIN/DEVELOPER/APPROVER 계정에서만 노출된다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerRejectExecutionTool(server: McpServer): void {
  server.registerTool(
    "reject_execution",
    {
      title: "실행 반려",
      description: "PENDING 상태의 API 실행 요청을 반려한다.",
      inputSchema,
    },
    safeTool<{ api_execution_id: number; reject_reason: string }>(({ api_execution_id, reject_reason }) =>
      request<ApiExecution>({ method: "POST", url: `/api-executions/${api_execution_id}/reject`, data: { reject_reason } }),
    ),
  );
}
