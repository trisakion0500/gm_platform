import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ApiExecution } from "../types";

const inputSchema = {
  api_execution_id: z.number().int().positive().describe("조회할 실행 이력 ID"),
};

/**
 * get_execution tool을 등록한다. GET /api-executions/:id — 실행 이력 단건을
 * 요청 파라미터(request_json)·응답 데이터(response_data)까지 포함해 조회한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerGetExecutionTool(server: McpServer): void {
  server.registerTool(
    "get_execution",
    {
      title: "실행 이력 단건 조회",
      description: "API 실행 이력 한 건을 요청 파라미터·응답 데이터까지 포함해 조회한다. 승인/반려 결과 확인용.",
      inputSchema,
    },
    safeTool<{ api_execution_id: number }>(({ api_execution_id }) =>
      request<ApiExecution>({ method: "GET", url: `/api-executions/${api_execution_id}` }),
    ),
  );
}
