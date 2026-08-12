import { forceReindexApis } from "./apiReindex";
import logger, { exitAfterFlush } from "../utils/logger";

async function main() {
  const result = await forceReindexApis();
  logger.info(`build-index-apis 완료: API ${result.count}건`);
  await exitAfterFlush(0);
}

main().catch(async (err) => {
  logger.error("build-index-apis 실패", err);
  await exitAfterFlush(1);
});
