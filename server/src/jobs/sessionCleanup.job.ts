import cron, { ScheduledTask } from 'node-cron';
import { env } from '../config/env';
import { runExclusive } from '../config/db';
import { cleanupExpiredSessions } from '../db/cleanup.db';
import logger from '../utils/logger';

const LOCK_NAME = 'gm_platform:session_cleanup';

/**
 * 만료된 user_session 행을 주기적으로 삭제하는 크론 잡을 등록한다.
 * expired_at이 지난 세션은 refresh 자체가 불가능해 재사용 가치가 없는데,
 * 로그인마다 새 행이 쌓이기만 하고 삭제 로직이 없어 테이블이 무한정 커지는 문제를 정리한다.
 * 스케일아웃 시 인스턴스마다 이 크론이 각자 등록되어 같은 스케줄에 중복 실행되므로,
 * runExclusive(advisory lock)로 감싸 한 시점에 한 인스턴스만 실제로 DELETE를 수행하게 한다
 * (다른 인스턴스는 락 획득 실패로 조용히 건너뜀 — 다음 스케줄에 다시 시도).
 * 반환하는 ScheduledTask는 app.ts의 정상 종료 훅이 stop()해 DB pool 종료보다 먼저 스케줄을
 * 멈추는 데 쓰인다 — 순서가 바뀌면 pool이 닫힌 뒤 크론이 발동해 "Pool is closed" 에러가 난다.
 * @author trisakion
 * @returns 정상 종료 시 stop()을 호출할 ScheduledTask 핸들
 */
export function startSessionCleanupJob(): ScheduledTask {
  return cron.schedule(env.sessionCleanupCron, async () => {
    try {
      const ran = await runExclusive(LOCK_NAME, async () => {
        const deletedCount = await cleanupExpiredSessions();
        logger.info(`Session cleanup - deleted ${deletedCount} expired session(s)`);
      });
      if (!ran)
        logger.info('Session cleanup skipped - another instance holds the lock');
    } catch (err) {
      logger.error('Session cleanup failed:', err);
    }
  });
}
