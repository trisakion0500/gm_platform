import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ActiveCodeGroup } from "../types";

const inputSchema = {
  project_id: z.number().int().positive().describe("조회할 프로젝트 ID"),
};

/**
 * list_code_groups tool을 등록한다. GET /code-groups/active-with-items —
 * 프로젝트의 활성 코드그룹과 각 그룹의 활성 아이템을 함께 반환한다.
 * API 실행 시 SELECT/RADIO/CHECKBOX 파라미터 값을 채우거나 응답 코드값을 해석할 때 사용한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerListCodeGroupsTool(server: McpServer): void {
  server.registerTool(
    "list_code_groups",
    {
      title: "코드그룹/코드아이템 조회",
      description: "프로젝트의 활성 코드그룹과 각 그룹의 활성 코드아이템(code_value/code_name)을 함께 조회한다.",
      inputSchema,
    },
    safeTool<{ project_id: number }>(({ project_id }) =>
      request<{ items: ActiveCodeGroup[] }>({ method: "GET", url: "/code-groups/active-with-items", params: { project_id } }),
    ),
  );
}
