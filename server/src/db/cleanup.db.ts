import { callSP } from '../config/db';

/**
 * expired_at이 지난 user_session 행을 status와 무관하게 삭제한다.
 * @author trisakion
 * @returns 삭제된 행 수
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const [, [data]] = await callSP('SP_CLEANUP_EXPIRED_SESSIONS', []);
  return data[0].deleted_count as number;
}
