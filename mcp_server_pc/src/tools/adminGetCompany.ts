import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { CompanyRow } from "../types";

const inputSchema = {
  company_id: z.number().int().positive().describe("조회할 회사 ID"),
};

/**
 * admin_get_company tool을 등록한다. GET /companies/:company_id — 회사 상세를 조회한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminGetCompanyTool(server: McpServer): void {
  server.registerTool(
    "admin_get_company",
    {
      title: "회사 상세 조회",
      description: "회사 상세 정보를 조회한다. SUPER_ADMIN 외 역할은 본인 소속 회사가 아니면 31001(회사 없음)로 응답한다.",
      inputSchema,
    },
    safeTool<{ company_id: number }>(({ company_id }) =>
      request<CompanyRow>({ method: "GET", url: `/companies/${company_id}` }),
    ),
  );
}
