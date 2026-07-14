import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ApiExecution } from "../types";

const inputSchema = {
  api_execution_id: z.number().int().positive().describe("취소할 실행 이력 ID (본인이 요청한 PENDING 건만 가능)"),
  reject_reason: z.string().min(1).describe("취소 사유"),
};

/**
 * cancel_execution tool을 등록한다. POST /api-executions/:id/cancel —
 * 본인이 요청한 PENDING 상태 실행 건만 취소할 수 있다(GM Platform이 request_user_id로 검증).
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerCancelExecutionTool(server: McpServer): void {
  server.registerTool(
    "cancel_execution",
    {
      title: "실행 취소",
      description: "본인이 요청한 PENDING 상태의 API 실행 건을 취소한다.",
      inputSchema,
    },
    safeTool<{ api_execution_id: number; reject_reason: string }>(({ api_execution_id, reject_reason }) =>
      request<ApiExecution>({ method: "POST", url: `/api-executions/${api_execution_id}/cancel`, data: { reject_reason } }),
    ),
  );
}
