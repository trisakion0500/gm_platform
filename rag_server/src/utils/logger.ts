import log4js from "log4js";
import "../config/logger";

const logger = log4js.getLogger("app");

// log4js.shutdown()이 디스크 I/O 정체 등으로 멈추면 exitAfterFlush()가 영원히 대기해, 원래
// 무조건 즉시 죽던 process.exit()이 "안 죽는" 상태로 바뀌는 역설이 생긴다 — 이 시간 안에 flush가
// 안 끝나면 flush를 포기하고서라도 종료를 강행한다(정상 케이스는 항상 이보다 훨씬 빨리 끝남).
const SHUTDOWN_TIMEOUT_MS = 3000;

/**
 * log4js 파일 appender(dateFile)는 비동기로 쓰기 때문에, logger.error() 직후 곧바로 process.exit()을
 * 호출하면 아직 flush되지 않은 마지막 로그 줄이 파일에 남지 않고 통째로 유실된다(콘솔 appender는
 * 동기라 터미널에는 보이지만 logs/*.log에는 없는 상태가 됨). 모든 appender의 shutdown(flush) 완료를
 * 기다린 뒤에만 프로세스를 종료해 이 유실을 막되, SHUTDOWN_TIMEOUT_MS 안에 안 끝나면 그냥 종료한다.
 * @author trisakion
 * @param code 프로세스 종료 코드
 */
export async function exitAfterFlush(code: number): Promise<never> {
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, SHUTDOWN_TIMEOUT_MS);
    log4js.shutdown(() => {
      clearTimeout(timer);
      resolve();
    });
  });
  process.exit(code);
}

export default logger;
