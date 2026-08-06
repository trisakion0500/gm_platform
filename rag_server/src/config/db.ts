import mysql, { RowDataPacket, PoolConnection } from "mysql2/promise";
import { env } from "./env";
import logger from "../utils/logger";

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 2, // 락 획득/해제 전용 — 동시에 많은 커넥션이 필요 없음
  queueLimit: 0,
  timezone: "local",
  charset: "utf8mb4",
});

const LOCK_POLL_INTERVAL_MS = 2000;

/**
 * GM Platform이 이미 쓰는 MySQL advisory lock(SP_LOCK_ACQUIRE/SP_LOCK_RELEASE, GET_LOCK 기반 —
 * 같은 gm_platform DB에 이미 배포돼 있음)을 그대로 재사용해 재인덱싱을 인스턴스 간 상호배제한다.
 * SP_LOCK_ACQUIRE는 timeout=0(non-blocking) 고정으로 만들어져 있어(server/의 세션 정리 크론
 * 용도로 그렇게 설계됨 — 다음 스케줄에 또 돌아오니 대기할 이유가 없는 크론과 달리, 여기서는
 * 검증된 인덱스 없이는 서비스를 열 수 없으므로 대기가 필요하다), 여기서는 그걸 반복 폴링해
 * "타임아웃 있는 블로킹 대기"를 애플리케이션 레벨에서 구현한다 — 공용 DB 스키마를 rag_server
 * 전용 요구로 새로 건드리지 않기 위함. GET_LOCK은 락을 커넥션 세션에 묶어 관리하므로 pool에서
 * 커넥션 하나를 직접 뽑아 유지해야 한다(server/src/config/db.ts의 동일 패턴 참고). 락 보유
 * 프로세스가 죽으면(비정상 종료 포함) 그 세션의 커넥션이 끊기면서 MySQL이 락을 자동 해제한다 —
 * 별도 stale-lock 정리 로직이 필요 없다.
 * @param lockName 락 이름 (인스턴스 간 공유되는 문자열 키)
 * @param timeoutMs 락 획득 대기 최대 시간(ms) — 초과 시 예외
 * @param fn 락을 획득했을 때 실행할 작업
 * @returns fn의 반환값
 */
export async function runExclusive<T>(
  lockName: string,
  timeoutMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    const deadline = Date.now() + timeoutMs;
    let acquired = await acquireLock(conn, lockName);
    while (!acquired) {
      if (Date.now() >= deadline)
        throw new Error(`락(${lockName}) 획득 실패 — ${timeoutMs}ms 안에 획득하지 못했습니다`);
      await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_INTERVAL_MS));
      acquired = await acquireLock(conn, lockName);
    }

    try {
      return await fn();
    } finally {
      await releaseLock(conn, lockName);
    }
  } finally {
    conn.release();
  }
}

/**
 * SP_LOCK_ACQUIRE를 runExclusive가 붙잡고 있는 커넥션에 직접 호출해 advisory lock 획득을 시도한다.
 * @param conn runExclusive가 pool에서 직접 뽑아 유지 중인 단일 커넥션
 * @param lockName 획득할 advisory lock 이름
 * @returns 락 획득 성공 여부
 */
async function acquireLock(conn: PoolConnection, lockName: string): Promise<boolean> {
  const [resultSets] = await conn.query(`CALL SP_LOCK_ACQUIRE(?)`, [lockName]);
  const sets = resultSets as unknown as RowDataPacket[][];
  if (sets[0]?.[0]?.RESULT !== 0) {
    logger.warn(`SP_LOCK_ACQUIRE(${lockName}) failed to run normally — treating as not acquired`);
    return false;
  }
  return (sets[1]?.[0] as { acquired?: number } | undefined)?.acquired === 1;
}

/**
 * SP_LOCK_RELEASE를 획득 때와 동일한 커넥션에서 호출한다.
 * @param conn SP_LOCK_ACQUIRE 때와 동일한 커넥션
 * @param lockName 해제할 advisory lock 이름
 * @returns void
 */
async function releaseLock(conn: PoolConnection, lockName: string): Promise<void> {
  await conn.query(`CALL SP_LOCK_RELEASE(?)`, [lockName]);
}

export default pool;
