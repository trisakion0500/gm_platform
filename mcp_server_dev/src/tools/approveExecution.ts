import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ApiExecution } from "../types";

const inputSchema = {
  api_execution_id: z.number().int().positive().describe("승인할 실행 이력 ID (PENDING 상태만 가능)"),
};

/**
 * approve_execution tool을 등록한다. POST /api-executions/:id/approve —
 * 승인 즉시 GM Platform이 대상 외부 API를 실제로 호출하고 최종 실행 이력을 반환한다.
 * SUPER_ADMIN/DEVELOPER/APPROVER 계정에서만 노출된다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerApproveExecutionTool(server: McpServer): void {
  server.registerTool(
    "approve_execution",
    {
      title: "실행 승인",
      description: "PENDING 상태의 API 실행 요청을 승인한다 — 승인 즉시 실제 외부 API가 호출된다.",
      inputSchema,
    },
    safeTool<{ api_execution_id: number }>(({ api_execution_id }) =>
      request<ApiExecution>({ method: "POST", url: `/api-executions/${api_execution_id}/approve` }),
    ),
  );
}
