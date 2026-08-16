import { forceReindexLogs } from "./logAuditReindex";
import logger, { exitAfterFlush } from "../utils/logger";

async function main() {
  const result = await forceReindexLogs();
  logger.info(`build-index-logs 완료: 감사 로그 ${result.count}건`);
  await exitAfterFlush(0);
}

main().catch(async (err) => {
  logger.error("build-index-logs 실패", err);
  await exitAfterFlush(1);
});
