import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ProjectAdminRow } from "../types";

const inputSchema = {
  project_id: z.number().int().positive().describe("조회할 프로젝트 ID"),
};

/**
 * admin_get_project tool을 등록한다. GET /projects/:project_id — 프로젝트 상세를 조회한다.
 * SUPER_ADMIN/DEVELOPER 전용, DEVELOPER는 실제 배정된 프로젝트가 아니면 31002로 응답한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminGetProjectTool(server: McpServer): void {
  server.registerTool(
    "admin_get_project",
    {
      title: "프로젝트 상세 조회 (관리용)",
      description: "프로젝트 상세 정보(api_base_url, has_api_key 포함)를 조회한다.",
      inputSchema,
    },
    safeTool<{ project_id: number }>(({ project_id }) =>
      request<ProjectAdminRow>({ method: "GET", url: `/projects/${project_id}` }),
    ),
  );
}
