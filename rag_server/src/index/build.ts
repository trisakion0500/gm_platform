import { forceReindex } from "./reindex";
import logger, { exitAfterFlush } from "../utils/logger";

async function main() {
  const result = await forceReindex();
  logger.info(`build-index 완료: 파일 ${result.fileCount}개, 청크 ${result.chunkCount}개`);
  await exitAfterFlush(0);
}

main().catch(async (err) => {
  logger.error("build-index 실패", err);
  await exitAfterFlush(1);
});
