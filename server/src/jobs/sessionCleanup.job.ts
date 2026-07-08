import cron from 'node-cron';
import { env } from '../config/env';
import { cleanupExpiredSessions } from '../db/cleanup.db';
import logger from '../utils/logger';

/**
 * 만료된 user_session 행을 주기적으로 삭제하는 크론 잡을 등록한다.
 * expired_at이 지난 세션은 refresh 자체가 불가능해 재사용 가치가 없는데,
 * 로그인마다 새 행이 쌓이기만 하고 삭제 로직이 없어 테이블이 무한정 커지는 문제를 정리한다.
 * @author trisakion
 * @returns void
 */
export function startSessionCleanupJob(): void {
  cron.schedule(env.sessionCleanupCron, async () => {
    try {
      const deletedCount = await cleanupExpiredSessions();
      logger.info(`Session cleanup - deleted ${deletedCount} expired session(s)`);
    } catch (err) {
      logger.error('Session cleanup failed:', err);
    }
  });
}
