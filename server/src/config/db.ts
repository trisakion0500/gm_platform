import mysql, { RowDataPacket, PoolConnection, Pool } from "mysql2/promise";
import { env } from "./env";
import { DBError } from "../types";
import { ERROR_MAP } from "../constants/errors";
import logger from "../utils/logger";

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  // MySQL time_zone이 SYSTEM(=호스트 OS 로컬, 이 환경은 KST)이라 NOW() 등이 실제로는 로컬 시간을 반환한다.
  // "+00:00"으로 고정하면 그 로컬 값을 UTC라고 잘못 라벨링하게 되어(실제 변환은 없음),
  // Node에서 절대시각으로 계산한 Date(예: JWT 만료시각)를 DB에 저장할 때 로컬 NOW()와 9시간 어긋난다.
  // "local"은 Node 프로세스의 로컬 시간대(=이 환경에서는 MySQL과 동일한 KST)를 그대로 사용해 양쪽을 일치시킨다.
  timezone: "local",
  charset: "utf8mb4",
});

// log_audit 전용 pool. 메인 DB와 물리적으로 다른 VM/인스턴스일 수 있어 완전히 독립된 커넥션 풀로 관리한다
// (logAudit.db.ts만 이 pool을 쓴다 — 다른 도메인 db 파일은 여전히 기본 pool을 통해 callSP를 호출).
export const logPool = mysql.createPool({
  host: env.logDb.host,
  port: env.logDb.port,
  user: env.logDb.user,
  password: env.logDb.password,
  database: env.logDb.name,
  waitForConnections: true,
  connectionLimit: env.logDb.connectionLimit,
  queueLimit: 0,
  timezone: "local",
  charset: "utf8mb4",
});

/**
 * SP를 호출하고 결과셋 튜플을 반환한다.
 * 첫 번째 결과셋은 항상 RESULT 코드 행이며, 이후 결과셋은 데이터 배열로 반환한다.
 * 데이터 SELECT가 여러 개인 경우 dataSets[0], dataSets[1] 순으로 접근한다.
 * RESULT=99인 경우 DB 시스템 오류로 간주하여 DBError를 던진다.
 * @author trisakion
 * @param sp 호출할 SP 이름 (예: 'SP_GET_USER_BY_ID')
 * @param params SP에 전달할 파라미터 배열
 * @param targetPool 호출에 사용할 pool (기본값: 메인 DB pool, log_audit 계열은 logPool을 명시 전달)
 * @returns [statusRows, dataSets] — statusRows[0].RESULT로 결과 코드 확인, dataSets는 데이터 결과셋 배열
 */
export async function callSP(
  sp: string,
  params: unknown[],
  targetPool: Pool = pool,
): Promise<[RowDataPacket[], RowDataPacket[][]]> {
  const placeholders = params.map(() => "?").join(", ");
  let results;
  try {
    [results] = await targetPool.query(`CALL ${sp}(${placeholders})`, params);
  } catch (err) {
    throw new DBError(
      50001,
      `${ERROR_MAP.DB_ERROR.message} [${sp}]`,
      ERROR_MAP.DB_ERROR.httpStatus,
      { cause: err },
    );
  }
  const sets = results as RowDataPacket[][];
  const statusRow = sets[0]?.[0];
  if (statusRow?.RESULT === undefined) {
    throw new DBError(
      50001,
      `${ERROR_MAP.DB_ERROR.message} [${sp}]: RESULT column missing`,
      ERROR_MAP.DB_ERROR.httpStatus,
    );
  }
  if (statusRow.RESULT === 99) {
    throw new DBError(
      50001,
      `${ERROR_MAP.DB_ERROR.message} [${sp}]`,
      ERROR_MAP.DB_ERROR.httpStatus,
      { cause: statusRow.ERROR_MESSAGE },
    );
  }
  const dataSets = sets.slice(1).filter((s) => Array.isArray(s));
  return [sets[0] ?? [], dataSets];
}

/**
 * MySQL 세션 수준 advisory lock(SP_LOCK_ACQUIRE/SP_LOCK_RELEASE, 내부적으로 GET_LOCK/RELEASE_LOCK)으로
 * 스케일아웃 시 여러 인스턴스가 동시에 같은 크론 배치를 중복 실행하지 않도록 한다(coupon_platform의
 * SpExecutorService.runExclusive와 동일 패턴, Redis 등 별도 분산 락 인프라 없이 이미 쓰고 있는
 * MySQL만으로 해결). GET_LOCK은 락을 커넥션 세션에 묶어 관리하므로 pool에서 커넥션 하나를 직접
 * 뽑아 유지해야 한다 — callSP처럼 매 호출마다 pool이 임의로 골라주는 커넥션을 쓰면 락을 건 커넥션과
 * 푸는 커넥션이 달라질 수 있다. timeout=0(non-blocking)으로 시도해 이미 다른 인스턴스가 실행 중이면
 * 대기하지 않고 즉시 포기한다 — 크론은 다음 스케줄에 또 돌아오므로 여기서 기다릴 이유가 없다.
 * @author trisakion
 * @param lockName 배치를 식별하는 락 이름 (인스턴스 간 공유되는 문자열 키)
 * @param fn 락을 획득했을 때만 실행할 작업
 * @returns 락을 획득해 fn을 실행했으면 true, 다른 인스턴스가 이미 실행 중이라 건너뛰었으면 false
 */
export async function runExclusive(
  lockName: string,
  fn: () => Promise<void>,
): Promise<boolean> {
  const conn = await pool.getConnection();
  try {
    const acquired = await acquireLock(conn, lockName);
    if (!acquired)
      return false;

    try {
      await fn();
    } finally {
      await releaseLock(conn, lockName);
    }
    return true;
  } finally {
    conn.release();
  }
}

/**
 * SP_LOCK_ACQUIRE를 runExclusive가 붙잡고 있는 커넥션에 직접 호출해 advisory lock 획득을 시도한다.
 * SP가 RESULT=99(시스템 오류)를 반환해도 예외를 던지지 않고 "락을 못 잡음"으로 안전하게 처리한다 —
 * 크론 배치 하나가 이번 스케줄을 건너뛰는 것이 예외를 밖으로 던져 크론 스케줄러 자체를 흔드는 것보다 안전하다.
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
