import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { PaginatedResponse, Project } from "../types";

const PAGE_SIZES = [20, 30, 50, 100] as const;

const inputSchema = {
  page: z.number().int().positive().default(1).describe("페이지 번호 (1부터)"),
  page_size: z.union(PAGE_SIZES.map((n) => z.literal(n))).default(100).describe("페이지 크기 (20/30/50/100 중 하나)"),
};

/**
 * list_projects tool을 등록한다. GET /projects — 로그인 계정이 실제 user_role을 가진 프로젝트 목록을
 * 조회한다(SUPER_ADMIN은 전체). OPERATOR 등은 프로젝트를 여러 개 가질 수 있어, 다른 tool에 넘길
 * project_id를 확인하려면 이 tool을 가장 먼저 호출해야 한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerListProjectsTool(server: McpServer): void {
  server.registerTool(
    "list_projects",
    {
      title: "접근 가능한 프로젝트 목록 조회",
      description: "이 계정이 실제 권한(user_role)을 가진 프로젝트 목록을 조회한다. 다른 tool에 넘길 project_id를 확인할 때 가장 먼저 호출한다.",
      inputSchema,
    },
    safeTool<{ page: number; page_size: number }>(({ page, page_size }) =>
      request<PaginatedResponse<Project>>({ method: "GET", url: "/projects", params: { page, page_size } }),
    ),
  );
}
