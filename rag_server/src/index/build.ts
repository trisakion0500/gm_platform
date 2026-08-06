import { forceReindex } from "./reindex";
import logger from "../utils/logger";

async function main() {
  const result = await forceReindex();
  logger.info(`build-index 완료: 파일 ${result.fileCount}개, 청크 ${result.chunkCount}개`);
  process.exit(0);
}

main().catch((err) => {
  logger.error("build-index 실패", err);
  process.exit(1);
});
