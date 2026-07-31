import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ApiExecution } from "../types";

const inputSchema = {
  api_id: z.number().int().positive().describe("실행할 API ID (list_apis 결과의 api_id)"),
  request_json: z.record(z.string(), z.unknown()).describe("API Request 파라미터 (list_apis/list_code_groups로 확인한 필드 구성)"),
};

/**
 * execute_api tool을 등록한다. POST /apis/:api_id/execute —
 * 승인이 필요 없는 API는 즉시 실행되고, 승인 필요 API는 PENDING 상태로 등록되어
 * GM Platform 화면의 승인 대기 큐에서 APPROVER가 처리한다(이 서버는 승인 tool을 노출하지 않음).
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerExecuteApiTool(server: McpServer): void {
  server.registerTool(
    "execute_api",
    {
      title: "API 실행",
      description: "등록된 API를 실행한다. 승인이 필요하면 PENDING 상태로 등록되며, 승인/반려는 GM Platform 화면에서 처리된다.",
      inputSchema,
    },
    safeTool<{ api_id: number; request_json: Record<string, unknown> }>(({ api_id, request_json }) =>
      request<ApiExecution>({ method: "POST", url: `/apis/${api_id}/execute`, data: { request_json } }),
    ),
  );
}
