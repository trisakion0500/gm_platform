import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ActiveApi } from "../types";

const inputSchema = {
  project_id: z.number().int().positive().describe("조회할 프로젝트 ID"),
};

/**
 * list_apis tool을 등록한다. GET /apis/active — 프로젝트의 실행 가능한 활성 API 목록을 반환한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerListApisTool(server: McpServer): void {
  server.registerTool(
    "list_apis",
    {
      title: "API 목록 조회",
      description: "프로젝트의 실행 가능한 활성 API 목록을 조회한다 (api_id, api_name, api_stage).",
      inputSchema,
    },
    safeTool<{ project_id: number }>(({ project_id }) =>
      request<ActiveApi[]>({ method: "GET", url: "/apis/active", params: { project_id } }),
    ),
  );
}
