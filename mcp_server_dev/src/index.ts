import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getRoleCode } from "./gmClient";
import logger from "./utils/logger";
import { registerListProjectsTool } from "./tools/listProjects";
import { registerListApisTool } from "./tools/listApis";
import { registerListCodeGroupsTool } from "./tools/listCodeGroups";
import { registerExecuteApiTool } from "./tools/executeApi";
import { registerListExecutionsTool } from "./tools/listExecutions";
import { registerGetExecutionTool } from "./tools/getExecution";
import { registerCancelExecutionTool } from "./tools/cancelExecution";
import { registerListPendingExecutionsTool } from "./tools/listPendingExecutions";
import { registerApproveExecutionTool } from "./tools/approveExecution";
import { registerRejectExecutionTool } from "./tools/rejectExecution";

// GM Platform role_code (CLAUDE.md 참고: 10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR).
// 승인/반려/승인대기 조회 tool은 이 세 역할로 로그인했을 때만 노출한다 — 최종 방어선은
// 여전히 GM Platform 서버의 프로젝트별 재검증(assertProjectRole 등)이고, 이건 UX 차원의 1차 필터다.
const APPROVAL_CAPABLE_ROLES = [10, 20, 30];

/**
 * env 계정으로 로그인해 role_code를 확인한 뒤, 그 범위만큼 tool을 등록하고 stdio transport로 연결한다.
 * @returns void
 */
async function main(): Promise<void> {
  const roleCode = await getRoleCode();

  const server = new McpServer({ name: "gm-platform-mcp-server", version: "1.0.0" });

  registerListProjectsTool(server);
  registerListApisTool(server);
  registerListCodeGroupsTool(server);
  registerExecuteApiTool(server);
  registerListExecutionsTool(server);
  registerGetExecutionTool(server);
  registerCancelExecutionTool(server);

  if (APPROVAL_CAPABLE_ROLES.includes(roleCode)) {
    registerListPendingExecutionsTool(server);
    registerApproveExecutionTool(server);
    registerRejectExecutionTool(server);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`gm-platform-mcp-server started - role_code=${roleCode}`);
}

main().catch((err) => {
  logger.error("gm-platform-mcp-server 시작 실패", err);
  process.exit(1);
});
